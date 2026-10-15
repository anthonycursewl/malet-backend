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

export class CreateCreditEntryDto {
  @IsIn([...CREDIT_TYPES], {
    message: `type must be one of: ${CREDIT_TYPES.join(', ')}`,
  })
  type: 'receivable' | 'payable';

  @IsString()
  @IsNotEmpty()
  concept: string;

  /** Person or business that owes / is owed (optional). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  party?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  /** Calendar due date (YYYY-MM-DD). Required: this is what places it on the calendar. */
  @IsDateString({}, { message: 'due_date must be a valid ISO date' })
  due_date: string;

  /** Optional Malet account to move the money in when settled. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  account_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
