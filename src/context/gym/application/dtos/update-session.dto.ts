import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  GYM_SESSION_STATUSES,
  GymSessionStatus,
  RPE_MAX,
  RPE_MIN,
} from '../../domain/constants';
import { SessionExerciseDto } from './create-session.dto';

export class UpdateSessionDto {
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid ISO date' })
  date?: string;

  @IsOptional()
  @IsIn([...GYM_SESSION_STATUSES], {
    message: `status must be one of: ${GYM_SESSION_STATUSES.join(', ')}`,
  })
  status?: GymSessionStatus | null;

  /** `null` unassigns the routine. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routine_id?: string | null;

  /** `null` unassigns the routine day. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  routine_day_id?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'started_at must be a valid ISO date' })
  started_at?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'finished_at must be a valid ISO date' })
  finished_at?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  duration_minutes?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RPE_MIN)
  @Max(RPE_MAX)
  rpe?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  /** When present, it replaces every logged exercise/set of the session. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseDto)
  exercises?: SessionExerciseDto[];
}
