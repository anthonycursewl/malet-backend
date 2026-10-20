import { randomUUID } from 'crypto';
import {
  INVOICE_PREFIX,
  INVOICE_SEQUENCE_PADDING,
  InvoiceStatus,
  RECEIPT_ISSUER_CODE,
  SaleItemType,
} from '../constants';

/** A printable line of the invoice (snapshot taken when it is created). */
export interface InvoiceLinePrimitives {
  /** Null when the line is a free concept (service). */
  product_id: string | null;
  name: string;
  item_type: SaleItemType;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
}

export interface InvoiceLineInput {
  product_id?: string | null;
  name: string;
  item_type?: SaleItemType;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export interface InvoicePrimitives {
  id: string;
  store_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  sequence: number;
  year: number;
  number: string;
  currency: string;
  subtotal: number;
  total: number;
  notes?: string | null;
  status: InvoiceStatus;
  issued_at: Date;
  due_at?: Date | null;
  paid_at?: Date | null;
  payment_method_id?: string | null;
  sale_id?: string | null;
  receipt_id?: string | null;
  lines: InvoiceLinePrimitives[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface InvoiceCreateInput {
  store_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  sequence: number;
  year: number;
  currency: string;
  notes?: string | null;
  issued_at: Date;
  due_at?: Date | null;
  lines: InvoiceLineInput[];
  created_by: string;
}

export interface InvoiceUpdateInput {
  customer_id?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  issued_at?: Date;
  due_at?: Date | null;
  /** When provided, replaces the whole document lines. */
  lines?: InvoiceLineInput[];
}

/** Rounds to 2 decimals so the JSON snapshot matches the database decimal. */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Builds the invoice folio: `F-BRD-{year}-{sequence padded to 6 digits}`.
 * Independent from the receipt sequence (`R-...`).
 */
export function buildInvoiceNumber(year: number, sequence: number): string {
  const padded = String(sequence).padStart(INVOICE_SEQUENCE_PADDING, '0');
  return `${INVOICE_PREFIX}-${RECEIPT_ISSUER_CODE}-${year}-${padded}`;
}

const toInvoiceLines = (lines: InvoiceLineInput[]): InvoiceLinePrimitives[] =>
  lines.map((line) => ({
    product_id: line.product_id ?? null,
    name: line.name.trim(),
    item_type: line.item_type ?? (line.product_id ? 'product' : 'service'),
    quantity: line.quantity,
    unit_price: line.unit_price,
    unit_cost: line.unit_cost,
    total: roundMoney(line.unit_price * line.quantity),
  }));

const totalOf = (lines: InvoiceLinePrimitives[]): number =>
  roundMoney(lines.reduce((acc, line) => acc + line.total, 0));

/**
 * Invoice (factura): details the products/services to charge a customer.
 * It does not affect income nor emit a receipt until it is paid; when paid it
 * is linked to the sale and receipt created at that moment.
 */
export class Invoice {
  private readonly id: string;
  private readonly store_id: string;
  private readonly customer_id: string | null;
  private readonly customer_name: string | null;
  private readonly sequence: number;
  private readonly year: number;
  private readonly number: string;
  private readonly currency: string;
  private readonly subtotal: number;
  private readonly total: number;
  private readonly notes: string | null;
  private readonly status: InvoiceStatus;
  private readonly issued_at: Date;
  private readonly due_at: Date | null;
  private readonly paid_at: Date | null;
  private readonly payment_method_id: string | null;
  private readonly sale_id: string | null;
  private readonly receipt_id: string | null;
  private readonly lines: InvoiceLinePrimitives[];
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;

  constructor(
    id: string,
    store_id: string,
    customer_id: string | null,
    customer_name: string | null,
    sequence: number,
    year: number,
    number: string,
    currency: string,
    subtotal: number,
    total: number,
    notes: string | null,
    status: InvoiceStatus,
    issued_at: Date,
    due_at: Date | null,
    paid_at: Date | null,
    payment_method_id: string | null,
    sale_id: string | null,
    receipt_id: string | null,
    lines: InvoiceLinePrimitives[],
    created_by: string,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.customer_id = customer_id;
    this.customer_name = customer_name;
    this.sequence = sequence;
    this.year = year;
    this.number = number;
    this.currency = currency;
    this.subtotal = subtotal;
    this.total = total;
    this.notes = notes;
    this.status = status;
    this.issued_at = issued_at;
    this.due_at = due_at;
    this.paid_at = paid_at;
    this.payment_method_id = payment_method_id;
    this.sale_id = sale_id;
    this.receipt_id = receipt_id;
    this.lines = lines;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: InvoiceCreateInput): Invoice {
    const now = new Date();
    const lines = toInvoiceLines(data.lines);
    const subtotal = totalOf(lines);

    return new Invoice(
      randomUUID(),
      data.store_id,
      data.customer_id ?? null,
      data.customer_name?.trim() || null,
      data.sequence,
      data.year,
      buildInvoiceNumber(data.year, data.sequence),
      data.currency,
      subtotal,
      subtotal,
      data.notes?.trim() || null,
      'pending',
      data.issued_at,
      data.due_at ?? null,
      null,
      null,
      null,
      null,
      lines,
      data.created_by,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: InvoicePrimitives): Invoice {
    return new Invoice(
      primitives.id,
      primitives.store_id,
      primitives.customer_id ?? null,
      primitives.customer_name ?? null,
      primitives.sequence,
      primitives.year,
      primitives.number,
      primitives.currency,
      Number(primitives.subtotal),
      Number(primitives.total),
      primitives.notes ?? null,
      primitives.status,
      primitives.issued_at,
      primitives.due_at ?? null,
      primitives.paid_at ?? null,
      primitives.payment_method_id ?? null,
      primitives.sale_id ?? null,
      primitives.receipt_id ?? null,
      (primitives.lines ?? []).map((line) => ({
        ...line,
        product_id: line.product_id ?? null,
        item_type: line.item_type ?? (line.product_id ? 'product' : 'service'),
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        unit_cost: Number(line.unit_cost),
        total: Number(line.total),
      })),
      primitives.created_by,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at ?? null,
    );
  }

  toPrimitives(): InvoicePrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      customer_id: this.customer_id,
      customer_name: this.customer_name,
      sequence: this.sequence,
      year: this.year,
      number: this.number,
      currency: this.currency,
      subtotal: this.subtotal,
      total: this.total,
      notes: this.notes,
      status: this.status,
      issued_at: this.issued_at,
      due_at: this.due_at,
      paid_at: this.paid_at,
      payment_method_id: this.payment_method_id,
      sale_id: this.sale_id,
      receipt_id: this.receipt_id,
      lines: this.lines,
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

  getCustomerId(): string | null {
    return this.customer_id;
  }

  getCustomerName(): string | null {
    return this.customer_name;
  }

  getSequence(): number {
    return this.sequence;
  }

  getYear(): number {
    return this.year;
  }

  getNumber(): string {
    return this.number;
  }

  getCurrency(): string {
    return this.currency;
  }

  getSubtotal(): number {
    return this.subtotal;
  }

  getTotal(): number {
    return this.total;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getStatus(): InvoiceStatus {
    return this.status;
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isPaid(): boolean {
    return this.status === 'paid';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  getIssuedAt(): Date {
    return this.issued_at;
  }

  getDueAt(): Date | null {
    return this.due_at;
  }

  getPaidAt(): Date | null {
    return this.paid_at;
  }

  getPaymentMethodId(): string | null {
    return this.payment_method_id;
  }

  getSaleId(): string | null {
    return this.sale_id;
  }

  getReceiptId(): string | null {
    return this.receipt_id;
  }

  getLines(): InvoiceLinePrimitives[] {
    return this.lines;
  }

  /** Units across every line. */
  getUnits(): number {
    return this.lines.reduce((acc, line) => acc + line.quantity, 0);
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

  getDeletedAt(): Date | null {
    return this.deleted_at;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  /** Replaces the mutable document data (only allowed while pending). */
  update(data: InvoiceUpdateInput): Invoice {
    const lines =
      data.lines !== undefined ? toInvoiceLines(data.lines) : this.lines;
    const subtotal = data.lines !== undefined ? totalOf(lines) : this.subtotal;

    return new Invoice(
      this.id,
      this.store_id,
      data.customer_id !== undefined ? data.customer_id : this.customer_id,
      data.customer_name !== undefined
        ? data.customer_name?.trim() || null
        : this.customer_name,
      this.sequence,
      this.year,
      this.number,
      this.currency,
      subtotal,
      subtotal,
      data.notes !== undefined ? data.notes?.trim() || null : this.notes,
      this.status,
      data.issued_at !== undefined ? data.issued_at : this.issued_at,
      data.due_at !== undefined ? data.due_at : this.due_at,
      this.paid_at,
      this.payment_method_id,
      this.sale_id,
      this.receipt_id,
      lines,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }

  /** Marks the invoice as paid and links the sale + receipt created for it. */
  pay(data: {
    payment_method_id: string | null;
    paid_at: Date;
    sale_id: string;
    receipt_id: string;
  }): Invoice {
    return new Invoice(
      this.id,
      this.store_id,
      this.customer_id,
      this.customer_name,
      this.sequence,
      this.year,
      this.number,
      this.currency,
      this.subtotal,
      this.total,
      this.notes,
      'paid',
      this.issued_at,
      this.due_at,
      data.paid_at,
      data.payment_method_id,
      data.sale_id,
      data.receipt_id,
      this.lines,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }

  /** Cancels a pending invoice (it never becomes a sale or receipt). */
  cancel(): Invoice {
    return new Invoice(
      this.id,
      this.store_id,
      this.customer_id,
      this.customer_name,
      this.sequence,
      this.year,
      this.number,
      this.currency,
      this.subtotal,
      this.total,
      this.notes,
      'cancelled',
      this.issued_at,
      this.due_at,
      this.paid_at,
      this.payment_method_id,
      this.sale_id,
      this.receipt_id,
      this.lines,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }

  softDelete(): Invoice {
    return new Invoice(
      this.id,
      this.store_id,
      this.customer_id,
      this.customer_name,
      this.sequence,
      this.year,
      this.number,
      this.currency,
      this.subtotal,
      this.total,
      this.notes,
      this.status,
      this.issued_at,
      this.due_at,
      this.paid_at,
      this.payment_method_id,
      this.sale_id,
      this.receipt_id,
      this.lines,
      this.created_by,
      this.created_at,
      new Date(),
      this.deleted_at ?? new Date(),
    );
  }
}
