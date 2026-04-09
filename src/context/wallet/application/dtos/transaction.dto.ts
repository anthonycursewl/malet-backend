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
import { IsCurrencyCode } from 'src/common/validators/currency.validator';

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['saving', 'expense', 'pending_payment'], {
    message: 'Type must be saving, expense or pending_payment',
  })
  type: string;

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
