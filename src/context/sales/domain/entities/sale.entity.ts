import { randomUUID } from 'crypto';
import {
  SaleItem,
  SaleItemInput,
  SaleItemPrimitives,
} from './sale-item.entity';

export interface SalePrimitives {
  id: string;
  store_id: string;
  payment_method_id?: string | null;
  /** Optional customer of the sale (shared identity across stores). */
  customer_id?: string | null;
  /** Line items: one per product sold. */
  items: SaleItemPrimitives[];
  /** Optional informational amount in another currency; never used in calculations. */
  reference_currency?: string | null;
  reference_amount?: number | null;
  sold_at: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  /** Computed: sum of the line totals. */
  total?: number;
  /** Computed: sum of the line profits. */
  profit?: number;
}

export interface SaleUpdateInput {
  payment_method_id?: string | null;
  customer_id?: string | null;
  /** When provided, replaces the whole cart. */
  items?: SaleItemInput[];
  reference_currency?: string | null;
  reference_amount?: number | null;
  sold_at?: Date;
}

/**
 * Sale header. The products live in its `items`, so a sale can hold several
 * products; every amount is a snapshot of the product prices at sale time.
 */
export class Sale {
  private readonly id: string;
  private readonly store_id: string;
  private readonly payment_method_id: string | null;
  private readonly customer_id: string | null;
  private readonly items: SaleItem[];
  private readonly reference_currency: string | null;
  private readonly reference_amount: number | null;
  private readonly sold_at: Date;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    store_id: string,
    payment_method_id: string | null,
    customer_id: string | null,
    items: SaleItem[],
    reference_currency: string | null,
    reference_amount: number | null,
    sold_at: Date,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.payment_method_id = payment_method_id;
    this.customer_id = customer_id;
    this.items = items;
    this.reference_currency = reference_currency;
    this.reference_amount = reference_amount;
    this.sold_at = sold_at;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    store_id: string;
    payment_method_id?: string | null;
    customer_id?: string | null;
    items: SaleItemInput[];
    reference_currency?: string | null;
    reference_amount?: number | null;
    sold_at: Date;
    created_by: string;
  }): Sale {
    const now = new Date();
    return new Sale(
      randomUUID(),
      data.store_id,
      data.payment_method_id ?? null,
      data.customer_id ?? null,
      data.items.map((item) => SaleItem.create(item)),
      data.reference_currency ?? null,
      data.reference_amount ?? null,
      data.sold_at,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: SalePrimitives): Sale {
    return new Sale(
      primitives.id,
      primitives.store_id,
      primitives.payment_method_id ?? null,
      primitives.customer_id ?? null,
      (primitives.items ?? []).map((item) => SaleItem.fromPrimitives(item)),
      primitives.reference_currency ?? null,
      primitives.reference_amount == null
        ? null
        : Number(primitives.reference_amount),
      primitives.sold_at,
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at,
    );
  }

  toPrimitives(): SalePrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      payment_method_id: this.payment_method_id,
      customer_id: this.customer_id,
      items: this.items.map((item) => item.toPrimitives()),
      reference_currency: this.reference_currency,
      reference_amount: this.reference_amount,
      sold_at: this.sold_at,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      total: this.getTotal(),
      profit: this.getProfit(),
    };
  }

  getId(): string {
    return this.id;
  }

  getStoreId(): string {
    return this.store_id;
  }

  getPaymentMethodId(): string | null {
    return this.payment_method_id;
  }

  getCustomerId(): string | null {
    return this.customer_id;
  }

  getItems(): SaleItem[] {
    return this.items;
  }

  /** Units sold across every line. */
  getUnits(): number {
    return this.items.reduce((acc, item) => acc + item.getQuantity(), 0);
  }

  getReferenceCurrency(): string | null {
    return this.reference_currency;
  }

  getReferenceAmount(): number | null {
    return this.reference_amount;
  }

  getSoldAt(): Date {
    return this.sold_at;
  }

  getCreatedBy(): string {
    return this.created_by;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  /** Sum of `unit_price * quantity` over the lines. */
  getTotal(): number {
    return this.items.reduce((acc, item) => acc + item.getTotal(), 0);
  }

  /** Sum of `(unit_price - unit_cost) * quantity` over the lines. */
  getProfit(): number {
    return this.items.reduce((acc, item) => acc + item.getProfit(), 0);
  }

  /**
   * Returns a copy with the given fields replaced. When `items` is provided the
   * whole cart is replaced (that is what the edit form sends).
   */
  update(data: SaleUpdateInput): Sale {
    return new Sale(
      this.id,
      this.store_id,
      data.payment_method_id !== undefined
        ? data.payment_method_id
        : this.payment_method_id,
      data.customer_id !== undefined ? data.customer_id : this.customer_id,
      data.items !== undefined
        ? data.items.map((item) => SaleItem.create(item))
        : this.items,
      data.reference_currency !== undefined
        ? data.reference_currency
        : this.reference_currency,
      data.reference_amount !== undefined
        ? data.reference_amount
        : this.reference_amount,
      data.sold_at !== undefined ? data.sold_at : this.sold_at,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }
}
