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

/** Edits a **pending** invoice; lines are replaced when provided. */
export class UpdateInvoiceDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'items must contain at least one concept' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items?: CreateSaleItemDto[];

  /** `null` unassigns the customer from the invoice. */
  @IsOptional()
  @IsString()
  customer_id?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'customer_name must be 255 characters or fewer',
  })
  customer_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'notes must be 2000 characters or fewer' })
  notes?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'issued_at must be a valid ISO date' })
  issued_at?: string;

  @IsOptional()
  @IsDateString({}, { message: 'due_at must be a valid ISO date' })
  due_at?: string | null;
}
