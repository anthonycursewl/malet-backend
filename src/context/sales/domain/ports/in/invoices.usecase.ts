import { Invoice } from '../../entities/invoice.entity';
import { Sale } from '../../entities/sale.entity';
import { Receipt } from '../../entities/receipt.entity';
import { InvoiceStatus } from '../../constants';
import { InvoiceTotals } from '../out/invoice.repository';
import { CreateInvoiceDto } from '../../../application/dtos/create-invoice.dto';
import { UpdateInvoiceDto } from '../../../application/dtos/update-invoice.dto';
import { PayInvoiceDto } from '../../../application/dtos/pay-invoice.dto';

export const INVOICES_USECASE = Symbol('INVOICES_USECASE');

export interface ListInvoicesFilters {
  store_id: string;
  take?: number;
  cursor?: string;
  status?: InvoiceStatus;
  customer_id?: string;
}

/** Result of paying an invoice: the document plus the created sale/receipt. */
export interface PayInvoiceResult {
  invoice: Invoice;
  sale: Sale;
  receipt: Receipt;
}

export interface InvoicesUseCase {
  list(filters: ListInvoicesFilters): Promise<Invoice[]>;
  getById(store_id: string, id: string): Promise<Invoice>;
  totals(store_id: string): Promise<InvoiceTotals>;
  create(
    store_id: string,
    user_id: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice>;
  update(store_id: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice>;
  cancel(store_id: string, id: string, user_id: string): Promise<Invoice>;
  softDelete(store_id: string, id: string): Promise<Invoice>;
  pay(
    store_id: string,
    id: string,
    user_id: string,
    dto: PayInvoiceDto,
  ): Promise<PayInvoiceResult>;
}
