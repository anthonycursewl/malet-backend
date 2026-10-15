import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { GYM_MUSCLE_GROUPS, MAX_LIST_TAKE } from '../../../domain/constants';

export class GymRecordsQueryDto {
  /** Restricts the records to one muscle group. */
  @IsOptional()
  @IsIn([...GYM_MUSCLE_GROUPS], {
    message: `muscle_group must be one of: ${GYM_MUSCLE_GROUPS.join(', ')}`,
  })
  muscle_group?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_TAKE)
  limit?: number;
}
