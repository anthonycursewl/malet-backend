import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  GYM_EXERCISE_TYPES,
  GYM_MUSCLE_GROUPS,
  MAX_LIST_TAKE,
} from '../../../domain/constants';

export class ExerciseListQueryDto {
  /** Case-insensitive search over the exercise name. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([...GYM_MUSCLE_GROUPS], {
    message: `muscle_group must be one of: ${GYM_MUSCLE_GROUPS.join(', ')}`,
  })
  muscle_group?: string;

  @IsOptional()
  @IsIn([...GYM_EXERCISE_TYPES], {
    message: `type must be one of: ${GYM_EXERCISE_TYPES.join(', ')}`,
  })
  type?: string;

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
