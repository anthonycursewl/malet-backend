import { randomUUID } from 'crypto';

export interface SaleItemPrimitives {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  /**
   * Product name resolved from the catalog when reading (never persisted here:
   * the immutable snapshot lives on the receipt).
   */
  product_name?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface SaleItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

/** A single product line of a sale (prices are snapshots taken at sale time). */
export class SaleItem {
  private readonly id: string;
  private readonly product_id: string;
  private readonly quantity: number;
  private readonly unit_price: number;
  private readonly unit_cost: number;
  private readonly product_name?: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    product_id: string,
    quantity: number,
    unit_price: number,
    unit_cost: number,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
    product_name?: string,
  ) {
    this.id = id;
    this.product_id = product_id;
    this.quantity = quantity;
    this.unit_price = unit_price;
    this.unit_cost = unit_cost;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
    this.product_name = product_name;
  }

  static create(data: SaleItemInput): SaleItem {
    const now = new Date();
    return new SaleItem(
      randomUUID(),
      data.product_id,
      data.quantity,
      data.unit_price,
      data.unit_cost,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: SaleItemPrimitives): SaleItem {
    return new SaleItem(
      primitives.id,
      primitives.product_id,
      Number(primitives.quantity),
      Number(primitives.unit_price),
      Number(primitives.unit_cost),
      primitives.created_at ?? new Date(),
      primitives.updated_at ?? new Date(),
      primitives.deleted_at ?? null,
      primitives.product_name,
    );
  }

  toPrimitives(): SaleItemPrimitives {
    return {
      id: this.id,
      product_id: this.product_id,
      quantity: this.quantity,
      unit_price: this.unit_price,
      unit_cost: this.unit_cost,
      ...(this.product_name !== undefined && { product_name: this.product_name }),
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getProductId(): string {
    return this.product_id;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getUnitPrice(): number {
    return this.unit_price;
  }

  getUnitCost(): number {
    return this.unit_cost;
  }

  getProductName(): string | undefined {
    return this.product_name;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  /** unit_price * quantity */
  getTotal(): number {
    return this.unit_price * this.quantity;
  }

  /** (unit_price - unit_cost) * quantity */
  getProfit(): number {
    return (this.unit_price - this.unit_cost) * this.quantity;
  }
}
