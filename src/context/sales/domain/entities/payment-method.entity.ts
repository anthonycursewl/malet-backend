import { randomUUID } from 'crypto';

export interface PaymentMethodPrimitives {
  id: string;
  store_id: string;
  name: string;
  active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class PaymentMethod {
  private readonly id: string;
  private readonly store_id: string;
  private readonly name: string;
  private readonly active: boolean;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    store_id: string,
    name: string,
    active: boolean,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.name = name;
    this.active = active;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    store_id: string;
    name: string;
    created_by: string;
  }): PaymentMethod {
    const now = new Date();
    return new PaymentMethod(
      randomUUID(),
      data.store_id,
      data.name,
      true,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: PaymentMethodPrimitives): PaymentMethod {
    return new PaymentMethod(
      primitives.id,
      primitives.store_id,
      primitives.name,
      primitives.active,
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at,
    );
  }

  toPrimitives(): PaymentMethodPrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      name: this.name,
      active: this.active,
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

  isActive(): boolean {
    return this.active;
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
    data: Partial<Pick<PaymentMethodPrimitives, 'name' | 'active'>>,
  ): PaymentMethod {
    return new PaymentMethod(
      this.id,
      this.store_id,
      data.name !== undefined ? data.name : this.name,
      data.active !== undefined ? data.active : this.active,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }
}
