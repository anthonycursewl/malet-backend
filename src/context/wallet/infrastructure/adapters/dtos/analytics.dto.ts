import {
  IsOptional,
  IsString,
  IsNumberString,
  IsIn,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TRANSACTION_TYPES, SORT_FIELDS, SORT_ORDERS } from '../../../domain/constants';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  account_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(TRANSACTION_TYPES, {
    message: `Type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
  })
  type?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Min(2000, { message: 'Year must be >= 2000' })
  @Max(2100, { message: 'Year must be <= 2100' })
  year?: number;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  month?: number;

  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO date (YYYY-MM-DD)' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO date (YYYY-MM-DD)' })
  to?: string;

  @IsOptional()
  @IsString()
  @IsIn(SORT_FIELDS, {
    message: `sort_by must be one of: ${SORT_FIELDS.join(', ')}`,
  })
  sort_by?: string;

  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS, {
    message: `order must be one of: ${SORT_ORDERS.join(', ')}`,
  })
  order?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Min(1, { message: 'Limit must be between 1 and 500' })
  @Max(500, { message: 'Limit must be between 1 and 500' })
  limit?: number;
}
