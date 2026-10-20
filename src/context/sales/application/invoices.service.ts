import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoicesUseCase,
  ListInvoicesFilters,
  PayInvoiceResult,
} from '../domain/ports/in/invoices.usecase';
import {
  INVOICE_REPOSITORY_PORT,
  InvoiceRepository,
  InvoiceTotals,
} from '../domain/ports/out/invoice.repository';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import {
  RECEIPT_REPOSITORY_PORT,
  ReceiptRepository,
} from '../domain/ports/out/receipt.repository';
import {
  CUSTOMERS_USECASE,
  CustomersUseCase,
} from '../domain/ports/in/customers.usecase';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';
import { Invoice } from '../domain/entities/invoice.entity';
import { Sale } from '../domain/entities/sale.entity';
import { SaleItemInput } from '../domain/entities/sale-item.entity';
import { Receipt } from '../domain/entities/receipt.entity';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';
import { PayInvoiceDto } from './dtos/pay-invoice.dto';
import { resolveLineInputs } from './resolve-lines';
import { ReceiptsService } from './receipts.service';

/**
 * Invoices (facturas): documents that detail the products/services to charge.
 * They only become a sale + receipt when they are paid; until then they never
 * affect income or the receipts list.
 */
@Injectable()
export class InvoicesService implements InvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY_PORT)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT)
    private readonly paymentMethodRepository: PaymentMethodRepository,
    @Inject(SALE_REPOSITORY_PORT)
    private readonly saleRepository: SaleRepository,
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(RECEIPT_REPOSITORY_PORT)
    private readonly receiptRepository: ReceiptRepository,
    @Inject(CUSTOMERS_USECASE)
    private readonly customersUseCase: CustomersUseCase,
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notifications: StoreNotificationsUseCase,
    private readonly receiptsService: ReceiptsService,
  ) {}

  async list(filters: ListInvoicesFilters): Promise<Invoice[]> {
    return this.invoiceRepository.findMany({
      store_id: filters.store_id,
      take: filters.take,
      cursor: filters.cursor,
      status: filters.status,
      customer_id: filters.customer_id,
    });
  }

  async getById(store_id: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById(store_id, id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found in this store');
    }
    return invoice;
  }

  async totals(store_id: string): Promise<InvoiceTotals> {
    return this.invoiceRepository.getTotals(store_id);
  }

  async create(
    store_id: string,
    user_id: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const customer = dto.customer_id
      ? await this.customersUseCase.assertLinked(store_id, dto.customer_id)
      : null;

    const lines = await resolveLineInputs(
      this.productRepository,
      store_id,
      dto.items,
    );
    const issued_at = dto.issued_at ? new Date(dto.issued_at) : new Date();
    const year = issued_at.getFullYear();
    const sequence = await this.invoiceRepository.reserveNextSequence(year);

    const invoice = Invoice.create({
      store_id,
      customer_id: customer?.getId() ?? null,
      customer_name: dto.customer_name ?? customer?.getName() ?? null,
      sequence,
      year,
      currency: store.getCurrency(),
      notes: dto.notes ?? null,
      issued_at,
      due_at: dto.due_at ? new Date(dto.due_at) : null,
      lines,
      created_by: user_id,
    });

    const saved = await this.invoiceRepository.save(invoice);
    this.notifyInvoice('invoice_created', user_id, saved);
    return saved;
  }

  async update(
    store_id: string,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.getById(store_id, id);
    this.assertPending(invoice, 'edited');

    let customer_id = dto.customer_id;
    let customer_name = dto.customer_name;

    if (dto.customer_id !== undefined) {
      if (dto.customer_id === null) {
        customer_id = null;
      } else {
        const customer = await this.customersUseCase.assertLinked(
          store_id,
          dto.customer_id,
        );
        customer_id = customer.getId();
        if (dto.customer_name === undefined) {
          customer_name = customer.getName();
        }
      }
    }

    const lines = dto.items
      ? await resolveLineInputs(this.productRepository, store_id, dto.items)
      : undefined;

    const updated = invoice.update({
      customer_id,
      customer_name,
      notes: dto.notes,
      issued_at: dto.issued_at ? new Date(dto.issued_at) : undefined,
      due_at:
        dto.due_at === undefined
          ? undefined
          : dto.due_at === null
            ? null
            : new Date(dto.due_at),
      lines,
    });

    return this.invoiceRepository.update(updated);
  }

  async cancel(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<Invoice> {
    const invoice = await this.getById(store_id, id);
    this.assertPending(invoice, 'cancelled');

    const cancelled = await this.invoiceRepository.update(invoice.cancel());
    this.notifyInvoice('invoice_cancelled', user_id, cancelled);
    return cancelled;
  }

  async softDelete(store_id: string, id: string): Promise<Invoice> {
    const invoice = await this.getById(store_id, id);
    if (invoice.isPaid()) {
      throw new ConflictException(
        'A paid invoice cannot be deleted: it is linked to its sale and receipt',
      );
    }

    return this.invoiceRepository.update(invoice.softDelete());
  }

  /**
   * Marks the invoice as paid and, at that moment only, creates the sale and
   * issues the receipt (`R-...`). Compensates the sale/receipt if the invoice
   * was paid concurrently.
   */
  async pay(
    store_id: string,
    id: string,
    user_id: string,
    dto: PayInvoiceDto,
  ): Promise<PayInvoiceResult> {
    const invoice = await this.getById(store_id, id);
    this.assertPending(invoice, 'paid');

    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const payment_method_id = await this.resolvePaymentMethodId(
      store_id,
      dto.payment_method_id,
    );
    const paid_at = dto.paid_at ? new Date(dto.paid_at) : new Date();

    // Products deleted after invoicing still get charged: the line becomes a
    // free concept with its snapshot name and price (no FK failure).
    const productIds = [
      ...new Set(
        invoice
          .getLines()
          .map((line) => line.product_id)
          .filter((product_id): product_id is string => product_id !== null),
      ),
    ];
    const products = productIds.length
      ? await this.productRepository.findManyByIds(store_id, productIds)
      : [];
    const alive = new Set(products.map((product) => product.getId()));

    const items: SaleItemInput[] = invoice.getLines().map((line) => {
      const linked = line.product_id !== null && alive.has(line.product_id);
      return {
        product_id: linked ? line.product_id : null,
        name: line.name,
        item_type: linked ? ('product' as const) : ('service' as const),
        quantity: line.quantity,
        unit_price: line.unit_price,
        unit_cost: line.unit_cost,
      };
    });

    const sale = await this.saleRepository.save(
      Sale.create({
        store_id,
        payment_method_id,
        customer_id: invoice.getCustomerId(),
        items,
        sold_at: paid_at,
        created_by: user_id,
      }),
    );

    let receipt: Receipt;
    try {
      receipt = await this.receiptsService.buildReceipt(
        store_id,
        sale,
        store,
        user_id,
        paid_at,
        {
          customer_name:
            dto.receipt_customer_name ?? invoice.getCustomerName() ?? undefined,
        },
      );
      receipt = await this.receiptRepository.save(receipt);
    } catch (error) {
      await this.saleRepository.hardDelete(sale.getId()).catch(() => undefined);
      throw error;
    }

    const paid = await this.invoiceRepository.markPaid(
      invoice.pay({
        payment_method_id,
        paid_at,
        sale_id: sale.getId(),
        receipt_id: receipt.getId(),
      }),
    );

    if (!paid) {
      await this.receiptRepository
        .hardDelete(receipt.getId())
        .catch(() => undefined);
      await this.saleRepository.hardDelete(sale.getId()).catch(() => undefined);
      throw new ConflictException(
        'This invoice was already paid or cancelled by another request',
      );
    }

    this.notifyInvoice('invoice_paid', user_id, paid);

    return { invoice: paid, sale, receipt };
  }

  /**
   * Aviso por email del ciclo de la factura. Se dispara sin esperar (`void`):
   * el SMTP nunca frena ni rompe la operación.
   */
  private notifyInvoice(
    event: 'invoice_created' | 'invoice_paid' | 'invoice_cancelled',
    actor_id: string,
    invoice: Invoice,
  ): void {
    const titles: Record<
      'invoice_created' | 'invoice_paid' | 'invoice_cancelled',
      string
    > = {
      invoice_created: 'Nueva factura',
      invoice_paid: 'Factura pagada',
      invoice_cancelled: 'Factura cancelada',
    };

    void this.notifications.notify(invoice.getStoreId(), event, {
      subject: `${titles[event]} · ${invoice.getNumber()}`,
      title: titles[event],
      intro: `${titles[event]} ${invoice.getNumber()} en la tienda.`,
      actor_id,
      rows: [
        {
          label: 'Cliente',
          value: invoice.getCustomerName() ?? 'Sin cliente',
        },
        {
          label: 'Total',
          value: `${invoice.getTotal().toFixed(2)} ${invoice.getCurrency()}`,
        },
        ...(invoice.isPaid() && invoice.getPaidAt()
          ? [
              {
                label: 'Pagada',
                value: invoice
                  .getPaidAt()
                  .toISOString()
                  .slice(0, 16)
                  .replace('T', ' '),
              },
            ]
          : []),
      ],
      footerNote:
        'Recibes este aviso porque el dueño de la tienda te añadió a los avisos por correo.',
    });
  }

  private assertPending(
    invoice: Invoice,
    action: 'edited' | 'paid' | 'cancelled',
  ): void {
    if (!invoice.isPending()) {
      throw new ConflictException(
        `Only pending invoices can be ${action} (current status: ${invoice.getStatus()})`,
      );
    }
  }

  /** Validates the payment method belongs to the store and is active. */
  private async resolvePaymentMethodId(
    store_id: string,
    payment_method_id: string | null | undefined,
  ): Promise<string | null> {
    if (!payment_method_id) {
      return null;
    }

    const paymentMethod = await this.paymentMethodRepository.findById(
      store_id,
      payment_method_id,
    );
    if (!paymentMethod) {
      throw new NotFoundException(
        'Payment method not found in this store (it may be deleted)',
      );
    }
    if (!paymentMethod.isActive()) {
      throw new ConflictException(
        'This payment method is deactivated and cannot be used',
      );
    }

    return paymentMethod.getId();
  }
}
