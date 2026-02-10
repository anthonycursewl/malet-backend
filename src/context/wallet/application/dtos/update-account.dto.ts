import {
  IsNumber,
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsOptional,
  IsUrl,
} from 'class-validator';

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

  @MaxLength(3, { message: 'Currency must be a string of length 3.' })
  @MinLength(3, { message: 'Currency must be a string of length 3.' })
  @IsString({ message: 'Currency must be a string.' })
  currency: string;

  @IsOptional()
  @IsString({ message: 'Icon must be a string.' })
  @IsUrl()
  icon?: string;
}
