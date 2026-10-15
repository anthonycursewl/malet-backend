import { Receipt } from '../../entities/receipt.entity';

export const RECEIPT_REPOSITORY_PORT = Symbol('RECEIPT_REPOSITORY_PORT');

export interface ListReceiptsOptions {
  store_id: string;
  take?: number;
  cursor?: string;
}

export interface ReceiptRepository {
  save(receipt: Receipt): Promise<Receipt>;
  findById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Receipt | null>;
  /** Public verification: looks the folio up across every store. */
  findByNumber(number: string): Promise<Receipt | null>;
  /** Only the audited "Facturar a" correction is updatable. */
  update(receipt: Receipt): Promise<Receipt>;
  findBySaleId(store_id: string, sale_id: string): Promise<Receipt | null>;
  findMany(options: ListReceiptsOptions): Promise<Receipt[]>;
  delete(id: string): Promise<Receipt>;
  restore(id: string): Promise<Receipt>;
  hardDelete(id: string): Promise<void>;
  /**
   * Reserves the next sequence number of the year atomically (inside the given
   * transaction when provided). The folio is global for Breadriuss, so the
   * sequence is never per-store.
   */
  reserveNextSequence(year: number): Promise<number>;
}
