import { randomUUID } from 'crypto';
import { StoreCurrency, StoreReceiptMode } from '../constants';

export interface StorePrimitives {
  id: string;
  name: string;
  user_id: string;
  currency: StoreCurrency;
  /** Contact info printed on the receipts (issuer data). */
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Política de recibos de la tienda (solo el dueño puede cambiarla). */
  receipt_mode?: StoreReceiptMode;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class Store {
  private readonly id: string;
  private readonly name: string;
  private readonly user_id: string;
  private readonly currency: StoreCurrency;
  private readonly phone: string | null;
  private readonly email: string | null;
  private readonly address: string | null;
  private readonly receipt_mode: StoreReceiptMode;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    name: string,
    user_id: string,
    currency: StoreCurrency,
    phone: string | null,
    email: string | null,
    address: string | null,
    receipt_mode: StoreReceiptMode,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.name = name;
    this.user_id = user_id;
    this.currency = currency;
    this.phone = phone;
    this.email = email;
    this.address = address;
    this.receipt_mode = receipt_mode;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    name: string;
    user_id: string;
    currency: StoreCurrency;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    receipt_mode?: StoreReceiptMode;
  }): Store {
    const now = new Date();
    return new Store(
      randomUUID(),
      data.name.trim(),
      data.user_id,
      data.currency,
      data.phone?.trim() || null,
      data.email?.trim() || null,
      data.address?.trim() || null,
      data.receipt_mode ?? 'ask',
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: StorePrimitives): Store {
    return new Store(
      primitives.id,
      primitives.name,
      primitives.user_id,
      primitives.currency ?? 'Bs',
      primitives.phone ?? null,
      primitives.email ?? null,
      primitives.address ?? null,
      primitives.receipt_mode ?? 'ask',
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at,
    );
  }

  toPrimitives(): StorePrimitives {
    return {
      id: this.id,
      name: this.name,
      user_id: this.user_id,
      currency: this.currency,
      phone: this.phone,
      email: this.email,
      address: this.address,
      receipt_mode: this.receipt_mode,
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

  /** Owner of the store: the only user allowed to hard-delete it. */
  getUserId(): string {
    return this.user_id;
  }

  /** Currency of every amount belonging to this store. */
  getCurrency(): StoreCurrency {
    return this.currency;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getEmail(): string | null {
    return this.email;
  }

  getAddress(): string | null {
    return this.address;
  }

  /** Política de recibos: `ask` | `always` | `never`. */
  getReceiptMode(): StoreReceiptMode {
    return this.receipt_mode;
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
    data: Partial<
      Pick<
        StorePrimitives,
        'name' | 'currency' | 'phone' | 'email' | 'address' | 'receipt_mode'
      >
    >,
  ): Store {
    return new Store(
      this.id,
      data.name !== undefined ? data.name.trim() : this.name,
      this.user_id,
      data.currency !== undefined ? data.currency : this.currency,
      data.phone !== undefined ? data.phone?.trim() || null : this.phone,
      data.email !== undefined ? data.email?.trim() || null : this.email,
      data.address !== undefined ? data.address?.trim() || null : this.address,
      data.receipt_mode !== undefined ? data.receipt_mode : this.receipt_mode,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }
}
