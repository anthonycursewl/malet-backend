import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
} from '../../domain/constants';

export class CreateNoteDto {
  /** Título visible. Vacío → la app muestra "Sin título". */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_TITLE_LENGTH, {
    message: `title must be ${MAX_NOTE_TITLE_LENGTH} characters or fewer`,
  })
  title?: string;

  /** Markdown crudo (se renderiza en el cliente). */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_CONTENT_LENGTH, {
    message: `content must be ${MAX_NOTE_CONTENT_LENGTH} characters or fewer`,
  })
  content?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
