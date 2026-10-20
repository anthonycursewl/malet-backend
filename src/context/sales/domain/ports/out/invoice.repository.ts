import { Invoice } from '../../entities/invoice.entity';
import { InvoiceStatus } from '../../constants';
import { DateRange } from '../../date-range';

export const INVOICE_REPOSITORY_PORT = Symbol('INVOICE_REPOSITORY_PORT');

export interface ListInvoicesOptions {
  store_id: string;
  take?: number;
  cursor?: string;
  status?: InvoiceStatus;
  customer_id?: string;
  range?: DateRange | null;
}

/** Totals shown by the "Por cobrar" card. */
export interface InvoiceTotals {
  pending_count: number;
  pending_total: number;
  paid_count: number;
  paid_total: number;
}

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<Invoice>;
  findById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Invoice | null>;
  findMany(options: ListInvoicesOptions): Promise<Invoice[]>;
  update(invoice: Invoice): Promise<Invoice>;
  /**
   * Atomically marks a **pending** invoice as paid. Returns `null` when another
   * request already paid/cancelled it (so the sale and receipt are compensated).
   */
  markPaid(invoice: Invoice): Promise<Invoice | null>;
  /** Reserves the next yearly invoice sequence (global, like the receipt). */
  reserveNextSequence(year: number): Promise<number>;
  getTotals(store_id: string): Promise<InvoiceTotals>;
}
