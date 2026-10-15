import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  CREDIT_STATUSES,
  CREDIT_TYPES,
  MAX_LIST_TAKE,
} from '../../../domain/constants';

export class CreditListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([...CREDIT_TYPES], {
    message: `type must be one of: ${CREDIT_TYPES.join(', ')}`,
  })
  type?: 'receivable' | 'payable';

  @IsOptional()
  @IsString()
  @IsIn([...CREDIT_STATUSES], {
    message: `status must be one of: ${CREDIT_STATUSES.join(', ')}`,
  })
  status?: 'pending' | 'settled';

  @IsOptional()
  @IsString()
  account_id?: string;

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
