import { randomUUID } from 'crypto';

export interface ProductPrimitives {
  id: string;
  store_id: string;
  name: string;
  cost: number;
  pvp: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class Product {
  private readonly id: string;
  private readonly store_id: string;
  private readonly name: string;
  private readonly cost: number;
  private readonly pvp: number;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    store_id: string,
    name: string,
    cost: number,
    pvp: number,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.name = name;
    this.cost = cost;
    this.pvp = pvp;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    store_id: string;
    name: string;
    cost: number;
    pvp: number;
    created_by: string;
  }): Product {
    const now = new Date();
    return new Product(
      randomUUID(),
      data.store_id,
      data.name,
      data.cost,
      data.pvp,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: ProductPrimitives): Product {
    return new Product(
      primitives.id,
      primitives.store_id,
      primitives.name,
      Number(primitives.cost),
      Number(primitives.pvp),
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at,
    );
  }

  toPrimitives(): ProductPrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      name: this.name,
      cost: this.cost,
      pvp: this.pvp,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getStoreId(): string {
    return this.store_id;
  }

  getName(): string {
    return this.name;
  }

  getCost(): number {
    return this.cost;
  }

  getPvp(): number {
    return this.pvp;
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

  update(
    data: Partial<Pick<ProductPrimitives, 'name' | 'cost' | 'pvp'>>,
  ): Product {
    return new Product(
      this.id,
      this.store_id,
      data.name !== undefined ? data.name : this.name,
      data.cost !== undefined ? data.cost : this.cost,
      data.pvp !== undefined ? data.pvp : this.pvp,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }
}
