import { Type } from 'class-transformer';
import {
  IsDateString,
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

export class CreateBodyMetricDto {
  /** Entry date (YYYY-MM-DD). One entry per day: re-sending it replaces it. */
  @IsDateString({}, { message: 'date must be a valid ISO date' })
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weight_kg must be a number' })
  @Min(0.01)
  @Max(MAX_WEIGHT_KG)
  weight_kg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'body_fat_pct must be a number' })
  @Min(0)
  @Max(MAX_BODY_FAT_PCT)
  body_fat_pct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'muscle_mass_kg must be a number' })
  @Min(0)
  @Max(MAX_WEIGHT_KG)
  muscle_mass_kg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'height_cm must be a number' })
  @Min(0)
  @Max(MAX_HEIGHT_CM)
  height_cm?: number;

  /** Tape measurements in cm, e.g. `{ "chest": 102, "waist": 84 }`. */
  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
