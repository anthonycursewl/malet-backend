import { randomUUID } from 'crypto';
import { SaleItemType } from '../constants';

export interface SaleItemPrimitives {
  id: string;
  /** Null for free concepts (services not linked to the catalog). */
  product_id?: string | null;
  /** Snapshot of the concept name (product name or free service name). */
  name: string;
  /** `product` | `service`. */
  item_type?: SaleItemType;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  /**
   * Legacy alias of `name` (rows read before the snapshot column existed).
   * Kept so old callers/tests keep working.
   */
  product_name?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface SaleItemInput {
  /** Omitted for free concepts (services). */
  product_id?: string | null;
  name: string;
  item_type?: SaleItemType;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

/**
 * A single line of a sale: a catalog product **or** a free service concept.
 * Every amount is a snapshot taken at sale time, so later catalog changes never
 * alter an already registered sale.
 */
export class SaleItem {
  private readonly id: string;
  private readonly product_id: string | null;
  private readonly name: string;
  private readonly item_type: SaleItemType;
  private readonly quantity: number;
  private readonly unit_price: number;
  private readonly unit_cost: number;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    product_id: string | null,
    name: string,
    item_type: SaleItemType,
    quantity: number,
    unit_price: number,
    unit_cost: number,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.product_id = product_id;
    this.name = name;
    this.item_type = item_type;
    this.quantity = quantity;
    this.unit_price = unit_price;
    this.unit_cost = unit_cost;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: SaleItemInput): SaleItem {
    const now = new Date();
    return new SaleItem(
      randomUUID(),
      data.product_id ?? null,
      data.name.trim(),
      data.item_type ?? (data.product_id ? 'product' : 'service'),
      data.quantity,
      data.unit_price,
      data.unit_cost,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: SaleItemPrimitives): SaleItem {
    const name = primitives.name ?? primitives.product_name ?? 'Producto';

    return new SaleItem(
      primitives.id,
      primitives.product_id ?? null,
      name,
      primitives.item_type ?? (primitives.product_id ? 'product' : 'service'),
      Number(primitives.quantity),
      Number(primitives.unit_price),
      Number(primitives.unit_cost),
      primitives.created_at ?? new Date(),
      primitives.updated_at ?? new Date(),
      primitives.deleted_at ?? null,
    );
  }

  toPrimitives(): SaleItemPrimitives {
    return {
      id: this.id,
      product_id: this.product_id,
      name: this.name,
      item_type: this.item_type,
      quantity: this.quantity,
      unit_price: this.unit_price,
      unit_cost: this.unit_cost,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getProductId(): string | null {
    return this.product_id;
  }

  getName(): string {
    return this.name;
  }

  getItemType(): SaleItemType {
    return this.item_type;
  }

  isService(): boolean {
    return this.item_type === 'service' || this.product_id === null;
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

  /** Snapshot name (kept for the receipt builder's old call sites). */
  getProductName(): string {
    return this.name;
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
