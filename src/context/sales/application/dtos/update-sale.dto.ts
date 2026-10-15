import { Type, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { STORE_CURRENCIES, StoreCurrency } from '../../domain/constants';
import { CreateSaleItemDto } from './create-sale.dto';

export class UpdateSaleDto {
  /**
   * Replaces the whole cart when provided: the sent items become the sale
   * lines (prices default to the product PVP/cost when omitted).
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'items must contain at least one product' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items?: CreateSaleItemDto[];

  /** `null` unassigns the payment method from the sale. */
  @IsOptional()
  @IsString()
  payment_method_id?: string | null;

  /** `null` unassigns the customer from the sale. */
  @IsOptional()
  @IsString()
  customer_id?: string | null;

  /**
   * Optional informational currency for `reference_amount`. Must be sent
   * together with `reference_amount` (both `null` clears the reference).
   * Never used in calculations or reports.
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

  @IsOptional()
  @IsDateString({}, { message: 'sold_at must be a valid ISO date' })
  sold_at?: string;
}
