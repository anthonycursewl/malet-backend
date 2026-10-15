import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_LIST_TAKE } from '../../../domain/constants';

export class MembersQueryDto {
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

  /** Keyset cursor: the `seq` of the last member of the previous page. */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'cursor must be an integer' })
  @Min(0)
  cursor?: number;
}
