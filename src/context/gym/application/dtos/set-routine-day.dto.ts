import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_REPS,
  MAX_REST_SECONDS,
  MAX_SETS,
  MAX_TARGET_WEIGHT,
} from '../../domain/constants';

/** One planned exercise inside a routine day. */
export class RoutineExerciseDto {
  @IsString()
  @IsNotEmpty()
  exercise_id: string;

  /** Defaults to 3. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SETS)
  sets?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_REPS)
  reps_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_REPS)
  reps_max?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'target_weight must be a number' })
  @Min(0)
  @Max(MAX_TARGET_WEIGHT)
  target_weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_REST_SECONDS)
  rest_seconds?: number;

  /** Same value groups the exercises into a superset. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  superset_group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Replaces the whole content of one day of the weekly plan. */
export class SetRoutineDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  /** A rest day cannot carry exercises. */
  @IsOptional()
  @IsBoolean()
  is_rest?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises?: RoutineExerciseDto[];
}
