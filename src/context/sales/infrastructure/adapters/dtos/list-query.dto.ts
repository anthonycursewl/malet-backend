import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_LIST_TAKE } from '../../../domain/constants';

/**
 * Query validada para listados paginados por cursor. Evita que un cliente pida
 * `take` arbitrario (unbounded query / NaN → 500).
 */
export class ListQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'take must be an integer' })
  @Min(1)
  @Max(MAX_LIST_TAKE)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
