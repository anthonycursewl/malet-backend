import { randomUUID } from 'crypto';
import {
  RECEIPT_ISSUER_CODE,
  RECEIPT_PREFIX,
  RECEIPT_SEQUENCE_PADDING,
} from '../constants';

/** A single printable line of the receipt (immutable snapshot). */
export interface ReceiptLinePrimitives {
  /** Null when the line is a free concept (service). */
  product_id: string | null;
  /** Product name at the moment the receipt was issued. */
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
}

/** Payment history entry of the receipt (immutable snapshot). */
export interface ReceiptPaymentPrimitives {
  payment_method_id?: string | null;
  /** Payment method name at the moment the receipt was issued. */
  payment_method_name?: string | null;
  amount: number;
  paid_at: string;
}

export interface ReceiptPrimitives {
  id: string;
  store_id: string;
  sale_id: string;
  /** Global yearly sequence number (1, 2, 3...). */
  sequence: number;
  /** Year the sequence belongs to. */
  year: number;
  /** Full folio, e.g. `R-BRD-2026-000123`. */
  number: string;
  customer_name?: string | null;
  /** Store currency snapshot; amounts never get converted. */
  currency: string;
  /** Issuer data frozen when the receipt was issued (immutable). */
  store_name?: string | null;
  store_phone?: string | null;
  store_email?: string | null;
  store_address?: string | null;
  subtotal: number;
  total: number;
  paid_amount: number;
  lines: ReceiptLinePrimitives[];
  payments: ReceiptPaymentPrimitives[];
  issued_at: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  /** Auditoría de la corrección del "Facturar a" (los importes no cambian). */
  customer_name_updated_at?: Date | null;
  customer_name_updated_by?: string | null;
}

/**
 * Builds the receipt folio: `R-BRD-{year}-{sequence padded to 6 digits}`.
 * Shared by every store because the sequence is global for Breadriuss.
 */
export function buildReceiptNumber(year: number, sequence: number): string {
  const padded = String(sequence).padStart(RECEIPT_SEQUENCE_PADDING, '0');
  return `${RECEIPT_PREFIX}-${RECEIPT_ISSUER_CODE}-${year}-${padded}`;
}

/**
 * Receipt belonging to a sale (`sale_id` is unique: one receipt per sale).
 * Every amount is a snapshot taken when it was issued, so later changes to the
 * sale, product or payment method never alter an already issued receipt.
 */
export class Receipt {
  private readonly id: string;
  private readonly store_id: string;
  private readonly sale_id: string;
  private readonly sequence: number;
  private readonly year: number;
  private readonly number: string;
  private readonly customer_name: string | null;
  private readonly currency: string;
  private readonly store_name: string | null;
  private readonly store_phone: string | null;
  private readonly store_email: string | null;
  private readonly store_address: string | null;
  private readonly subtotal: number;
  private readonly total: number;
  private readonly paid_amount: number;
  private readonly lines: ReceiptLinePrimitives[];
  private readonly payments: ReceiptPaymentPrimitives[];
  private readonly issued_at: Date;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;
  private readonly customer_name_updated_at: Date | null;
  private readonly customer_name_updated_by: string | null;

  constructor(
    id: string,
    store_id: string,
    sale_id: string,
    sequence: number,
    year: number,
    number: string,
    customer_name: string | null,
    currency: string,
    store_name: string | null,
    store_phone: string | null,
    store_email: string | null,
    store_address: string | null,
    subtotal: number,
    total: number,
    paid_amount: number,
    lines: ReceiptLinePrimitives[],
    payments: ReceiptPaymentPrimitives[],
    issued_at: Date,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at?: Date | null,
    customer_name_updated_at: Date | null = null,
    customer_name_updated_by: string | null = null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.sale_id = sale_id;
    this.sequence = sequence;
    this.year = year;
    this.number = number;
    this.customer_name = customer_name;
    this.currency = currency;
    this.store_name = store_name;
    this.store_phone = store_phone;
    this.store_email = store_email;
    this.store_address = store_address;
    this.subtotal = subtotal;
    this.total = total;
    this.paid_amount = paid_amount;
    this.lines = lines;
    this.payments = payments;
    this.issued_at = issued_at;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
    this.customer_name_updated_at = customer_name_updated_at;
    this.customer_name_updated_by = customer_name_updated_by;
  }

  static create(data: {
    store_id: string;
    sale_id: string;
    sequence: number;
    year: number;
    customer_name?: string | null;
    currency: string;
    store_name?: string | null;
    store_phone?: string | null;
    store_email?: string | null;
    store_address?: string | null;
    lines: ReceiptLinePrimitives[];
    payments: ReceiptPaymentPrimitives[];
    issued_at: Date;
    created_by: string;
  }): Receipt {
    const now = new Date();
    const subtotal = data.lines.reduce((acc, line) => acc + line.total, 0);
    const paid_amount = data.payments.reduce(
      (acc, payment) => acc + payment.amount,
      0,
    );

    return new Receipt(
      randomUUID(),
      data.store_id,
      data.sale_id,
      data.sequence,
      data.year,
      buildReceiptNumber(data.year, data.sequence),
      data.customer_name ?? null,
      data.currency,
      data.store_name ?? null,
      data.store_phone ?? null,
      data.store_email ?? null,
      data.store_address ?? null,
      subtotal,
      subtotal,
      paid_amount,
      data.lines,
      data.payments,
      data.issued_at,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: ReceiptPrimitives): Receipt {
    return new Receipt(
      primitives.id,
      primitives.store_id,
      primitives.sale_id,
      primitives.sequence,
      primitives.year,
      primitives.number,
      primitives.customer_name ?? null,
      primitives.currency,
      primitives.store_name ?? null,
      primitives.store_phone ?? null,
      primitives.store_email ?? null,
      primitives.store_address ?? null,
      Number(primitives.subtotal),
      Number(primitives.total),
      Number(primitives.paid_amount),
      primitives.lines ?? [],
      primitives.payments ?? [],
      primitives.issued_at,
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at ?? null,
      primitives.customer_name_updated_at ?? null,
      primitives.customer_name_updated_by ?? null,
    );
  }

  toPrimitives(): ReceiptPrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      sale_id: this.sale_id,
      sequence: this.sequence,
      year: this.year,
      number: this.number,
      customer_name: this.customer_name,
      currency: this.currency,
      store_name: this.store_name,
      store_phone: this.store_phone,
      store_email: this.store_email,
      store_address: this.store_address,
      subtotal: this.subtotal,
      total: this.total,
      paid_amount: this.paid_amount,
      lines: this.lines,
      payments: this.payments,
      issued_at: this.issued_at,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      customer_name_updated_at: this.customer_name_updated_at,
      customer_name_updated_by: this.customer_name_updated_by,
    };
  }

  getId(): string {
    return this.id;
  }

  getStoreId(): string {
    return this.store_id;
  }

  getSaleId(): string {
    return this.sale_id;
  }

  getSequence(): number {
    return this.sequence;
  }

  getYear(): number {
    return this.year;
  }

  /** Full folio, e.g. `R-BRD-2026-000123`. */
  getNumber(): string {
    return this.number;
  }

  getCustomerName(): string | null {
    return this.customer_name;
  }

  getCurrency(): string {
    return this.currency;
  }

  /** Issuer data frozen at issue time (immutable). */
  getStoreName(): string | null {
    return this.store_name;
  }

  getStorePhone(): string | null {
    return this.store_phone;
  }

  getStoreEmail(): string | null {
    return this.store_email;
  }

  getStoreAddress(): string | null {
    return this.store_address;
  }

  getSubtotal(): number {
    return this.subtotal;
  }

  getTotal(): number {
    return this.total;
  }

  getPaidAmount(): number {
    return this.paid_amount;
  }

  getLines(): ReceiptLinePrimitives[] {
    return this.lines;
  }

  getPayments(): ReceiptPaymentPrimitives[] {
    return this.payments;
  }

  getIssuedAt(): Date {
    return this.issued_at;
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

  getCustomerNameUpdatedAt(): Date | null {
    return this.customer_name_updated_at;
  }

  getCustomerNameUpdatedBy(): string | null {
    return this.customer_name_updated_by;
  }

  /**
   * Corrects the "Facturar a" of an issued receipt. Everything else stays
   * immutable (amounts, lines and the folio), and the change is audited.
   */
  updateCustomerName(name: string | null, user_id: string): Receipt {
    return new Receipt(
      this.id,
      this.store_id,
      this.sale_id,
      this.sequence,
      this.year,
      this.number,
      name?.trim() || null,
      this.currency,
      this.store_name,
      this.store_phone,
      this.store_email,
      this.store_address,
      this.subtotal,
      this.total,
      this.paid_amount,
      this.lines,
      this.payments,
      this.issued_at,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
      new Date(),
      user_id,
    );
  }
}
