import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DATE_PRESETS, MAX_LIST_TAKE } from '../../../domain/constants';

export class SalesQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([...DATE_PRESETS], {
    message: `preset must be one of: ${DATE_PRESETS.join(', ')}`,
  })
  preset?: string;

  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO date' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO date' })
  to?: string;

  @IsOptional()
  @IsString()
  payment_method_id?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

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
