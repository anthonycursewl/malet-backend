import { Type, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { STORE_CURRENCIES, StoreCurrency } from '../../domain/constants';

/** One product line of a sale. Prices default to the product PVP/cost. */
export class CreateSaleItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity?: number;

  /** Defaults to the product PVP when omitted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'unit_price must be a number' })
  @Min(0, { message: 'unit_price must be greater than or equal to 0' })
  unit_price?: number;

  /** Defaults to the product cost when omitted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'unit_cost must be a number' })
  @Min(0, { message: 'unit_cost must be greater than or equal to 0' })
  unit_cost?: number;
}

/** Opt-in receipt data sent together with a new sale. */
export class CreateSaleReceiptDto {
  /** When true the receipt is issued inside the same transaction as the sale. */
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Optional "Facturar a" name printed on the receipt. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'receipt.customer_name must be 255 characters or fewer',
  })
  customer_name?: string;
}

export class CreateSaleDto {
  /** Products sold by this sale (at least one). */
  @IsArray()
  @ArrayNotEmpty({ message: 'items must contain at least one product' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  /** `null` or omitted means the sale has no payment method assigned. */
  @IsOptional()
  @IsString()
  payment_method_id?: string | null;

  /** Optional customer linked to the store (shared identity). */
  @IsOptional()
  @IsString()
  customer_id?: string | null;

  /**
   * Optional informational currency for `reference_amount` (e.g. USD price of
   * a sale whose base currency is Bs). Must be sent together with
   * `reference_amount`. Never used in calculations or reports.
   */
  @IsOptional()
  @IsIn([...STORE_CURRENCIES], {
    message: `reference_currency must be one of: ${STORE_CURRENCIES.join(', ')}`,
  })
  reference_currency?: StoreCurrency | null;

  /**
   * Optional amount expressed in `reference_currency`, kept for reference
   * only. Must be sent together with `reference_currency`.
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? value : Number(value),
  )
  @IsNumber({}, { message: 'reference_amount must be a number' })
  @Min(0, {
    message: 'reference_amount must be greater than or equal to 0',
  })
  reference_amount?: number | null;

  /** Defaults to now when omitted. */
  @IsOptional()
  @IsDateString({}, { message: 'sold_at must be a valid ISO date' })
  sold_at?: string;

  /**
   * Optional receipt. When `enabled` the receipt is created in the same
   * transaction as the sale (folio `R-BRD-{year}-{sequence}`).
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateSaleReceiptDto)
  receipt?: CreateSaleReceiptDto;
}
