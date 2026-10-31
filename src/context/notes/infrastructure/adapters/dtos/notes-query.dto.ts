import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_NOTE_SEARCH_LENGTH,
  MAX_NOTES_TAKE,
} from '../../../domain/constants';

export class NotesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_SEARCH_LENGTH, {
    message: `search must be ${MAX_NOTE_SEARCH_LENGTH} characters or fewer`,
  })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_NOTES_TAKE)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
