import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'cost must be a number' })
  @Min(0, { message: 'cost must be greater than or equal to 0' })
  cost: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'pvp must be a number' })
  @Min(0, { message: 'pvp must be greater than or equal to 0' })
  pvp: number;
}
