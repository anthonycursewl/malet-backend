import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_BODY_FAT_PCT,
  MAX_HEIGHT_CM,
  MAX_WEIGHT_KG,
} from '../../domain/constants';

export class UpdateBodyMetricDto {
  /** `null` clears the value. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weight_kg must be a number' })
  @Min(0.01)
  @Max(MAX_WEIGHT_KG)
  weight_kg?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'body_fat_pct must be a number' })
  @Min(0)
  @Max(MAX_BODY_FAT_PCT)
  body_fat_pct?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'muscle_mass_kg must be a number' })
  @Min(0)
  @Max(MAX_WEIGHT_KG)
  muscle_mass_kg?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'height_cm must be a number' })
  @Min(0)
  @Max(MAX_HEIGHT_CM)
  height_cm?: number | null;

  /** `null` clears every tape measurement. */
  @IsOptional()
  @IsObject()
  measurements?: Record<string, number> | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
