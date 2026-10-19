import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListReceiptsFilters,
  ReceiptsUseCase,
} from '../domain/ports/in/receipts.usecase';
import { CreateReceiptDto } from './dtos/create-receipt.dto';
import { UpdateReceiptDto } from './dtos/update-receipt.dto';
import {
  Receipt,
  ReceiptLinePrimitives,
  ReceiptPaymentPrimitives,
} from '../domain/entities/receipt.entity';
import {
  buildReceiptVerifyToken,
  isValidReceiptVerifyToken,
} from '../domain/receipt-verify';
import { Sale } from '../domain/entities/sale.entity';
import { Product } from '../domain/entities/product.entity';
import { Store } from '../domain/entities/store.entity';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import {
  RECEIPT_REPOSITORY_PORT,
  ReceiptRepository,
} from '../domain/ports/out/receipt.repository';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';

@Injectable()
export class ReceiptsService implements ReceiptsUseCase {
  constructor(
    @Inject(RECEIPT_REPOSITORY_PORT)
    private readonly receiptRepository: ReceiptRepository,
    @Inject(SALE_REPOSITORY_PORT)
    private readonly saleRepository: SaleRepository,
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT)
    private readonly paymentMethodRepository: PaymentMethodRepository,
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notifications: StoreNotificationsUseCase,
  ) {}

  async issue(
    store_id: string,
    sale_id: string,
    user_id: string,
    dto?: CreateReceiptDto,
  ): Promise<Receipt> {
    // Idempotent: a sale can only have one receipt.
    const existing = await this.receiptRepository.findBySaleId(
      store_id,
      sale_id,
    );
    if (existing) {
      return existing;
    }

    const sale = await this.saleRepository.findById(store_id, sale_id);
    if (!sale) {
      throw new NotFoundException('Sale not found in this store');
    }

    const store = await this.storeRepository.findById(store_id);
    const issued_at = new Date();

    const receipt = await this.receiptRepository.save(
      await this.buildReceipt(store_id, sale, store, user_id, issued_at, dto),
    );

    this.notifyReceipt('receipt_issued', store, receipt, user_id);

    return receipt;
  }

  /**
   * Builds the immutable snapshot of a sale. Used both by the transactional
   * `POST /sales` flow and by the standalone issue endpoint.
   */
  async buildReceipt(
    store_id: string,
    sale: Sale,
    store: Store | null,
    user_id: string,
    issued_at: Date,
    dto?: CreateReceiptDto,
  ): Promise<Receipt> {
    const lines = await this.buildLines(store_id, sale);
    const payments: ReceiptPaymentPrimitives[] = [
      {
        payment_method_id: sale.getPaymentMethodId(),
        payment_method_name: await this.resolvePaymentMethodName(
          store_id,
          sale.getPaymentMethodId(),
        ),
        amount: sale.getTotal(),
        paid_at: issued_at.toISOString(),
      },
    ];

    const year = issued_at.getFullYear();
    const sequence = await this.receiptRepository.reserveNextSequence(year);

    return Receipt.create({
      store_id,
      sale_id: sale.getId(),
      sequence,
      year,
      customer_name: dto?.customer_name ?? null,
      currency: store?.getCurrency() ?? 'Bs',
      // Datos del emisor congelados en el recibo (inmutables).
      store_name: store?.getName() ?? null,
      store_phone: store?.getPhone() ?? null,
      store_email: store?.getEmail() ?? null,
      store_address: store?.getAddress() ?? null,
      lines,
      payments,
      issued_at,
      created_by: user_id,
    });
  }

  async list(filters: ListReceiptsFilters): Promise<Receipt[]> {
    return this.receiptRepository.findMany({
      store_id: filters.store_id,
      take: filters.take,
      cursor: filters.cursor,
    });
  }

  async getById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Receipt> {
    const receipt = await this.receiptRepository.findById(
      store_id,
      id,
      include_deleted,
    );
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  async getBySaleId(store_id: string, sale_id: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findBySaleId(
      store_id,
      sale_id,
    );
    if (!receipt) {
      throw new NotFoundException('This sale has no receipt');
    }
    return receipt;
  }

  /**
   * Los recibos son documentos con folio (los verifica cualquiera con el QR):
   * **solo el dueño de la tienda** puede borrarlos o restaurarlos. Cualquier
   * otro miembro recibe 403, aunque haya emitido el recibo.
   */
  private async assertStoreOwner(
    store_id: string,
    user_id: string,
  ): Promise<void> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can delete or restore receipts',
      );
    }
  }

  async softDelete(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<Receipt> {
    await this.assertStoreOwner(store_id, user_id);

    // Incluye los ya borrados para poder responder 409 en vez de 404.
    const receipt = await this.getById(store_id, id, true);
    if (receipt.isDeleted()) {
      throw new ConflictException('Receipt is already deleted');
    }

    const deleted = await this.receiptRepository.delete(receipt.getId());
    this.notifyReceipt(
      'receipt_deleted',
      await this.storeRepository.findById(store_id),
      deleted,
      user_id,
    );

    return deleted;
  }

  async restore(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<Receipt> {
    await this.assertStoreOwner(store_id, user_id);

    const receipt = await this.getById(store_id, id, true);
    return this.receiptRepository.restore(receipt.getId());
  }

  async hardDelete(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<void> {
    await this.assertStoreOwner(store_id, user_id);

    const receipt = await this.getById(store_id, id, true);
    return this.receiptRepository.hardDelete(receipt.getId());
  }

  /** Audited correction of the "Facturar a" (amounts stay immutable). */
  async updateCustomerName(
    store_id: string,
    id: string,
    user_id: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt> {
    const receipt = await this.getById(store_id, id);
    if (receipt.isDeleted()) {
      throw new ConflictException('The receipt is deleted');
    }

    const updated = await this.receiptRepository.update(
      receipt.updateCustomerName(dto.customer_name ?? null, user_id),
    );

    this.notifyReceipt(
      'receipt_updated',
      await this.storeRepository.findById(store_id),
      updated,
      user_id,
    );

    return updated;
  }

  /**
   * Aviso por email de un recibo. Se dispara sin esperar (`void`): el SMTP no
   * puede frenar ni romper la emisión, corrección o borrado del recibo.
   */
  private notifyReceipt(
    event: 'receipt_issued' | 'receipt_updated' | 'receipt_deleted',
    store: Store | null,
    receipt: Receipt,
    actor_id: string | null,
  ): void {
    const storeName = store?.getName() ?? 'tu tienda';

    const titles: Record<
      'receipt_issued' | 'receipt_updated' | 'receipt_deleted',
      string
    > = {
      receipt_issued: 'Recibo emitido',
      receipt_updated: 'Recibo corregido',
      receipt_deleted: 'Recibo eliminado',
    };

    const customer = receipt.getCustomerName();

    void this.notifications.notify(receipt.getStoreId(), event, {
      subject: `${storeName} · ${titles[event]}`,
      title: `${titles[event]} ${receipt.getNumber()}`,
      intro: `${titles[event]} en "${storeName}".`,
      actor_id,
      rows: [
        { label: 'Folio', value: receipt.getNumber() },
        {
          label: 'Total',
          value: `${receipt.getTotal().toFixed(2)} ${receipt.getCurrency()}`,
        },
        ...(customer ? [{ label: 'Facturado a', value: customer }] : []),
      ],
      footerNote:
        'Recibes este aviso porque el dueño de la tienda te añadió a los avisos por correo.',
    });
  }

  /** HMAC token of the folio: viaja en el QR para la verificación pública. */
  verifyToken(receipt: Receipt): string {
    return buildReceiptVerifyToken(receipt.getNumber(), this.verifySecret());
  }

  /**
   * Verificación pública: valida la firma del folio y devuelve solo datos no
   * sensibles (sin líneas, costos ni cliente).
   */
  async verifyPublic(
    number: string,
    token: string,
  ): Promise<{
    number: string;
    issued_at: string;
    total: number;
    currency: string;
    store_name: string | null;
    status: 'valid' | 'deleted';
  }> {
    if (!isValidReceiptVerifyToken(number, token, this.verifySecret())) {
      throw new ForbiddenException('Invalid verification token');
    }

    const receipt = await this.receiptRepository.findByNumber(number);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const store = await this.storeRepository.findById(
      receipt.getStoreId(),
      true,
    );

    return {
      number: receipt.getNumber(),
      issued_at: receipt.getIssuedAt().toISOString(),
      total: receipt.getTotal(),
      currency: receipt.getCurrency(),
      store_name: store?.getName() ?? null,
      status: receipt.isDeleted() ? 'deleted' : 'valid',
    };
  }

  /** Secreto de la firma de verificación (con respaldo seguro). */
  private verifySecret(): string {
    return (
      process.env.RECEIPT_VERIFY_SECRET ??
      process.env.JWT_SECRET ??
      'malet-receipt-verify'
    );
  }

  /** Snapshot of every printable line of the sale. */
  private async buildLines(
    store_id: string,
    sale: Sale,
  ): Promise<ReceiptLinePrimitives[]> {
    const lines: ReceiptLinePrimitives[] = [];

    for (const item of sale.getItems()) {
      // The product name usually comes resolved from the sale join; otherwise
      // it is looked up in the catalog.
      let product_name = item.getProductName();
      if (!product_name) {
        const product: Product | null = await this.productRepository.findById(
          store_id,
          item.getProductId(),
          true,
        );
        product_name = product?.getName() ?? 'Producto eliminado';
      }

      lines.push({
        product_id: item.getProductId(),
        product_name,
        quantity: item.getQuantity(),
        unit_price: item.getUnitPrice(),
        unit_cost: item.getUnitCost(),
        total: item.getTotal(),
      });
    }

    return lines;
  }

  /** Payment method name snapshot (`null` when the sale has no method). */
  private async resolvePaymentMethodName(
    store_id: string,
    payment_method_id: string | null,
  ): Promise<string | null> {
    if (!payment_method_id) {
      return null;
    }

    const paymentMethod = await this.paymentMethodRepository.findById(
      store_id,
      payment_method_id,
      true,
    );

    return paymentMethod?.getName() ?? null;
  }
}
