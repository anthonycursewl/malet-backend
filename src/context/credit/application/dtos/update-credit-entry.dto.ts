import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CREDIT_TYPES } from '../../domain/constants';

export class UpdateCreditEntryDto {
  @IsOptional()
  @IsIn([...CREDIT_TYPES], {
    message: `type must be one of: ${CREDIT_TYPES.join(', ')}`,
  })
  type?: 'receivable' | 'payable';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  concept?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  party?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsDateString({}, { message: 'due_date must be a valid ISO date' })
  due_date?: string;

  /** `null` unassigns the account. */
  @IsOptional()
  @IsString()
  account_id?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
