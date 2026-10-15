import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_LIST_TAKE } from '../../../domain/constants';

export class RoutineListQueryDto {
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
