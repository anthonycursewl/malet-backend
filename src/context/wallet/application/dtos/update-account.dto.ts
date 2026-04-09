import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsOptional,
  IsUrl,
  Validate,
} from 'class-validator';
import { IsCurrencyCode } from 'src/common/validators/currency.validator';

export class UpdateAccountDto {
  @MaxLength(255, { message: 'Name must be a string of length 255.' })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Balance must be a number with at most 2 decimal places.' },
  )
  @IsNotEmpty({ message: 'Balance is required.' })
  balance: number;

  @IsOptional()
  @IsString({ message: 'Currency must be a string.' })
  @Validate(IsCurrencyCode, { message: 'Currency not supported' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  currency: string;

  @IsOptional()
  @IsString({ message: 'Icon must be a string.' })
  @IsUrl()
  icon?: string;
}
