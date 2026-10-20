import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  INVOICE_STATUSES,
  InvoiceStatus,
  MAX_LIST_TAKE,
} from '../../../domain/constants';

export class InvoicesQueryDto {
  @IsOptional()
  @IsIn([...INVOICE_STATUSES], {
    message: `status must be one of: ${INVOICE_STATUSES.join(', ')}`,
  })
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_TAKE)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
