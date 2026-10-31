import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
} from '../../domain/constants';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_TITLE_LENGTH, {
    message: `title must be ${MAX_NOTE_TITLE_LENGTH} characters or fewer`,
  })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_CONTENT_LENGTH, {
    message: `content must be ${MAX_NOTE_CONTENT_LENGTH} characters or fewer`,
  })
  content?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  /** `true` expone la nota en la vista pública de solo lectura. */
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
