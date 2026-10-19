import { Receipt } from '../../entities/receipt.entity';
import { CreateReceiptDto } from '../../../application/dtos/create-receipt.dto';
import { UpdateReceiptDto } from '../../../application/dtos/update-receipt.dto';

export const RECEIPTS_USECASE = Symbol('RECEIPTS_USECASE');

export interface ListReceiptsFilters {
  store_id: string;
  take?: number;
  cursor?: string;
}

export interface ReceiptsUseCase {
  /** Issues the receipt of a sale (idempotent: returns the existing one). */
  issue(
    store_id: string,
    sale_id: string,
    user_id: string,
    dto?: CreateReceiptDto,
  ): Promise<Receipt>;
  list(filters: ListReceiptsFilters): Promise<Receipt[]>;
  getById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Receipt>;
  /** Receipt of a given sale. */
  getBySaleId(store_id: string, sale_id: string): Promise<Receipt>;
  /**
   * Borrado lógico del recibo. **Solo el dueño de la tienda** puede hacerlo
   * (el folio queda auditado y la verificación pública lo marca como eliminado).
   */
  softDelete(store_id: string, id: string, user_id: string): Promise<Receipt>;
  /** Restaura un recibo eliminado. **Solo el dueño de la tienda.** */
  restore(store_id: string, id: string, user_id: string): Promise<Receipt>;
  /** Borrado definitivo del recibo. **Solo el dueño de la tienda.** */
  hardDelete(store_id: string, id: string, user_id: string): Promise<void>;
  /** Audited correction of the "Facturar a" (amounts stay immutable). */
  updateCustomerName(
    store_id: string,
    id: string,
    user_id: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt>;
  /** HMAC token of the folio, used by the public verification. */
  verifyToken(receipt: Receipt): string;
  /** Public verification of a folio (minimal, non-sensitive payload). */
  verifyPublic(
    number: string,
    token: string,
  ): Promise<{
    number: string;
    issued_at: string;
    total: number;
    currency: string;
    store_name: string | null;
    status: 'valid' | 'deleted';
  }>;
}
