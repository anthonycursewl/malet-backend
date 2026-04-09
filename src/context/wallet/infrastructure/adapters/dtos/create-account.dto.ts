import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  Validate,
} from 'class-validator';
import { IsCurrencyCode } from 'src/common/validators/currency.validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  balance: number;

  @IsOptional()
  @IsString({ message: 'Currency must be a string.' })
  @Validate(IsCurrencyCode, { message: 'Currency not supported' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  currency: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
