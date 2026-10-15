import { randomUUID } from 'crypto';

export interface CustomerPrimitives {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

/**
 * Customer identity. It is global on purpose: the same record can be linked to
 * several stores (`store_customers`), so customer data is never duplicated.
 */
export class Customer {
  private readonly id: string;
  private readonly name: string;
  private readonly phone: string | null;
  private readonly email: string | null;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    name: string,
    phone: string | null,
    email: string | null,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    created_by: string;
  }): Customer {
    const now = new Date();
    return new Customer(
      randomUUID(),
      data.name.trim(),
      data.phone?.trim() || null,
      data.email?.trim() || null,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: CustomerPrimitives): Customer {
    return new Customer(
      primitives.id,
      primitives.name,
      primitives.phone ?? null,
      primitives.email ?? null,
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at ?? null,
    );
  }

  toPrimitives(): CustomerPrimitives {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getEmail(): string | null {
    return this.email;
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

  update(data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
  }): Customer {
    return new Customer(
      this.id,
      data.name !== undefined ? data.name.trim() : this.name,
      data.phone !== undefined ? data.phone?.trim() || null : this.phone,
      data.email !== undefined ? data.email?.trim() || null : this.email,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }
}
