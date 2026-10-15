import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
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
  GYM_MUSCLE_GROUPS,
  GYM_SESSION_STATUSES,
  GymMuscleGroup,
  GymSessionStatus,
  MAX_DURATION_SECONDS,
  MAX_REPS,
  MAX_TARGET_WEIGHT,
  RPE_MAX,
  RPE_MIN,
} from '../../domain/constants';

/** One logged set. Strength sets use reps/weight; cardio ones use duration/distance. */
export class SessionSetDto {
  /** Defaults to the position inside the array (1-based). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  set_number?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_REPS)
  reps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'weight must be a number' })
  @Min(0)
  @Max(MAX_TARGET_WEIGHT)
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RPE_MIN)
  @Max(RPE_MAX)
  rpe?: number;

  @IsOptional()
  @IsBoolean()
  is_warmup?: boolean;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_DURATION_SECONDS)
  duration_seconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'distance_meters must be a number' })
  @Min(0)
  distance_meters?: number;
}

export class SessionExerciseDto {
  /** Catalog exercise. Either this or `exercise_name` is required. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exercise_id?: string;

  /** Free-text name when the exercise is not in the catalog. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  exercise_name?: string;

  /** Optional muscle group for free-text exercises (used by the metrics). */
  @IsOptional()
  @IsIn([...GYM_MUSCLE_GROUPS], {
    message: `muscle_group must be one of: ${GYM_MUSCLE_GROUPS.join(', ')}`,
  })
  muscle_group?: GymMuscleGroup;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionSetDto)
  sets?: SessionSetDto[];
}

export class CreateSessionDto {
  /** Workout day (YYYY-MM-DD). Defaults to today (UTC). */
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid ISO date' })
  date?: string;

  @IsOptional()
  @IsIn([...GYM_SESSION_STATUSES], {
    message: `status must be one of: ${GYM_SESSION_STATUSES.join(', ')}`,
  })
  status?: GymSessionStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routine_id?: string;

  /**
   * When sent without `exercises`, the session is prefilled from this routine
   * day and starts as `in_progress`.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routine_day_id?: string;

  @IsOptional()
  @IsDateString({}, { message: 'started_at must be a valid ISO date' })
  started_at?: string;

  @IsOptional()
  @IsDateString({}, { message: 'finished_at must be a valid ISO date' })
  finished_at?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  duration_minutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RPE_MIN)
  @Max(RPE_MAX)
  rpe?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseDto)
  exercises?: SessionExerciseDto[];
}
