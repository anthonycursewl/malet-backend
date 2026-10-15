import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SalesUseCase } from '../domain/ports/in/sales.usecase';
import { CreateSaleDto, CreateSaleItemDto } from './dtos/create-sale.dto';
import { UpdateSaleDto } from './dtos/update-sale.dto';
import { Sale } from '../domain/entities/sale.entity';
import { SaleItemInput } from '../domain/entities/sale-item.entity';
import { Product } from '../domain/entities/product.entity';
import { Receipt } from '../domain/entities/receipt.entity';
import { ListSalesFilters } from '../domain/types';
import { resolveDateRange } from '../domain/date-range';
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
import { ReceiptsService } from './receipts.service';

/** Result of creating a sale, optionally with its receipt. */
export interface CreateSaleResult {
  sale: Sale;
  receipt: Receipt | null;
}

@Injectable()
export class SalesService implements SalesUseCase {
  constructor(
    @Inject(SALE_REPOSITORY_PORT)
    private readonly saleRepository: SaleRepository,
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT)
    private readonly paymentMethodRepository: PaymentMethodRepository,
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(RECEIPT_REPOSITORY_PORT)
    private readonly receiptRepository: ReceiptRepository,
    @Inject(CUSTOMERS_USECASE)
    private readonly customersUseCase: CustomersUseCase,
    private readonly receiptsService: ReceiptsService,
  ) {}

  async create(
    store_id: string,
    user_id: string,
    dto: CreateSaleDto,
  ): Promise<CreateSaleResult> {
    const items = await this.resolveItems(store_id, dto.items);
    const payment_method_id = await this.resolvePaymentMethodId(
      store_id,
      dto.payment_method_id,
    );
    // The customer must be linked to this store (shared identity).
    const customer = dto.customer_id
      ? await this.customersUseCase.assertLinked(store_id, dto.customer_id)
      : null;
    const reference = this.validateReferencePair(dto) ?? {
      reference_currency: null,
      reference_amount: null,
    };

    const sale = Sale.create({
      store_id,
      payment_method_id,
      customer_id: customer?.getId() ?? null,
      items,
      reference_currency: reference.reference_currency,
      reference_amount: reference.reference_amount,
      sold_at: dto.sold_at ? new Date(dto.sold_at) : new Date(),
      created_by: user_id,
    });

    const saved = await this.saleRepository.save(sale);

    // La política de la tienda manda: `always` emite siempre, `never` nunca y
    // `ask` respeta lo que pidió el cliente.
    const store = await this.storeRepository.findById(store_id);
    const receiptMode = store?.getReceiptMode() ?? 'ask';
    const shouldIssueReceipt =
      receiptMode === 'always'
        ? true
        : receiptMode === 'never'
          ? false
          : dto.receipt?.enabled === true;

    if (!shouldIssueReceipt) {
      return { sale: saved, receipt: null };
    }

    try {
      const receipt = await this.receiptsService.buildReceipt(
        store_id,
        saved,
        store,
        user_id,
        new Date(),
        // "Facturar a" defaults to the linked customer's name.
        { customer_name: dto.receipt?.customer_name ?? customer?.getName() },
      );

      await this.receiptRepository.save(receipt);

      return { sale: saved, receipt };
    } catch (error) {
      // Compensación: si el recibo no se pudo emitir, se revierte la venta para
      // que la petición sea todo-o-nada (el cliente puede reintentar limpio).
      await this.saleRepository
        .hardDelete(saved.getId())
        .catch(() => undefined);
      throw error;
    }
  }

  async list(filters: ListSalesFilters): Promise<Sale[]> {
    const range = resolveDateRange(filters);

    return this.saleRepository.findMany({
      store_id: filters.store_id,
      take: filters.take,
      cursor: filters.cursor,
      payment_method_id: filters.payment_method_id,
      product_id: filters.product_id,
      range,
    });
  }

  async getById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Sale> {
    const sale = await this.saleRepository.findById(
      store_id,
      id,
      include_deleted,
    );
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async update(
    store_id: string,
    id: string,
    dto: UpdateSaleDto,
  ): Promise<Sale> {
    const sale = await this.getById(store_id, id);
    const patch: Parameters<Sale['update']>[0] = {};

    if (dto.items !== undefined) {
      patch.items = await this.resolveItems(store_id, dto.items);
    }

    if (dto.payment_method_id !== undefined) {
      patch.payment_method_id = await this.resolvePaymentMethodId(
        store_id,
        dto.payment_method_id,
      );
    }

    if (dto.customer_id !== undefined) {
      patch.customer_id = dto.customer_id
        ? (
            await this.customersUseCase.assertLinked(store_id, dto.customer_id)
          ).getId()
        : null;
    }

    if (dto.sold_at !== undefined) patch.sold_at = new Date(dto.sold_at);

    const reference = this.validateReferencePair(dto);
    if (reference !== undefined) {
      patch.reference_currency = reference.reference_currency;
      patch.reference_amount = reference.reference_amount;
    }

    return this.saleRepository.update(sale.update(patch));
  }

  async softDelete(store_id: string, id: string): Promise<Sale> {
    const sale = await this.getById(store_id, id);
    return this.saleRepository.delete(sale.getId());
  }

  async restore(store_id: string, id: string): Promise<Sale> {
    const sale = await this.getById(store_id, id, true);
    return this.saleRepository.restore(sale.getId());
  }

  async hardDelete(
    store_id: string,
    id: string,
    user_id: string,
  ): Promise<void> {
    const sale = await this.getById(store_id, id, true);
    if (sale.getCreatedBy() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }

    return this.saleRepository.hardDelete(sale.getId());
  }

  /**
   * Validates every product of the cart in a **single query** and snapshots its
   * prices: later changes to the product never alter an already registered sale.
   */
  private async resolveItems(
    store_id: string,
    items: CreateSaleItemDto[],
  ): Promise<SaleItemInput[]> {
    const ids = [...new Set(items.map((item) => item.product_id))];
    const products = await this.productRepository.findManyByIds(store_id, ids);
    const byId = new Map(products.map((product) => [product.getId(), product]));

    return items.map((item) => {
      const product = byId.get(item.product_id);
      if (!product) {
        throw new NotFoundException(
          'Product not found in this store (it may be deleted)',
        );
      }

      return {
        product_id: product.getId(),
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? product.getPvp(),
        unit_cost: item.unit_cost ?? product.getCost(),
      };
    });
  }

  private async resolveProduct(
    store_id: string,
    product_id: string,
  ): Promise<Product> {
    const product = await this.productRepository.findById(store_id, product_id);
    if (!product) {
      throw new NotFoundException(
        'Product not found in this store (it may be deleted)',
      );
    }
    return product;
  }

  /**
   * Validates the informational reference pair (`reference_currency` +
   * `reference_amount`). Both fields must be sent together: omitted on both
   * (no reference), both set, or both `null` (clears the reference).
   * Returns `undefined` when neither field was sent.
   */
  private validateReferencePair(dto: {
    reference_currency?: string | null;
    reference_amount?: number | null;
  }):
    | { reference_currency: string | null; reference_amount: number | null }
    | undefined {
    const { reference_currency, reference_amount } = dto;

    if (reference_currency === undefined && reference_amount === undefined) {
      return undefined;
    }
    if (reference_currency === undefined || reference_amount === undefined) {
      throw new BadRequestException(
        'reference_currency and reference_amount must be provided together',
      );
    }
    if ((reference_currency === null) !== (reference_amount === null)) {
      throw new BadRequestException(
        'reference_currency and reference_amount must both be set or both be null',
      );
    }

    return { reference_currency, reference_amount };
  }

  /** Returns the payment method id (or null) after validating store ownership and status. */
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
        'This payment method is deactivated and cannot be used for new sales',
      );
    }

    return paymentMethod.getId();
  }
}
