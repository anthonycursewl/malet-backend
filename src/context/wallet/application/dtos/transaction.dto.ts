import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  Validate,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsCurrencyCode } from 'src/shared/common/validators/currency.validator';
import { TRANSACTION_TYPES } from '../../domain/constants';

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  @IsEnum(TRANSACTION_TYPES, {
    message: `Type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
  })
  type?: string;

  @IsString()
  @IsNotEmpty()
  account_id: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  tag_ids?: string[];

  @IsOptional()
  @IsString({ message: 'Currency code must be a string.' })
  @Validate(IsCurrencyCode, { message: 'Currency not supported' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  currency_code?: string;
}
