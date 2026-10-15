import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'cost must be a number' })
  @Min(0, { message: 'cost must be greater than or equal to 0' })
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'pvp must be a number' })
  @Min(0, { message: 'pvp must be greater than or equal to 0' })
  pvp?: number;
}
