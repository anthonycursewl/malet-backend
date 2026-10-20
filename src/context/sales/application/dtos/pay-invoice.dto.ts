import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Marks a pending invoice as paid: creates the sale and issues the receipt. */
export class PayInvoiceDto {
  /** Payment method used; `null`/omitted means "not specified". */
  @IsOptional()
  @IsString()
  payment_method_id?: string | null;

  /** Defaults to now when omitted. */
  @IsOptional()
  @IsDateString({}, { message: 'paid_at must be a valid ISO date' })
  paid_at?: string;

  /** "Facturar a" of the receipt (defaults to the invoice customer name). */
  @IsOptional()
  @IsString()
  receipt_customer_name?: string;
}
