import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateSaleItemDto } from './create-sale.dto';

/** Draft invoice (factura): lines are products and/or free service concepts. */
export class CreateInvoiceDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'items must contain at least one concept' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  /** Optional customer linked to the store (shared identity). */
  @IsOptional()
  @IsString()
  customer_id?: string | null;

  /** "Facturar a" printed on the invoice (defaults to the customer name). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'customer_name must be 255 characters or fewer',
  })
  customer_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'notes must be 2000 characters or fewer' })
  notes?: string | null;

  /** Defaults to now when omitted. */
  @IsOptional()
  @IsDateString({}, { message: 'issued_at must be a valid ISO date' })
  issued_at?: string;

  /** Optional payment due date (informational). */
  @IsOptional()
  @IsDateString({}, { message: 'due_at must be a valid ISO date' })
  due_at?: string | null;
}
