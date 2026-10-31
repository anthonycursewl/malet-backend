import { Controller, Get, Inject, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  NOTES_USECASE,
  NotesUseCase,
} from '../../../domain/ports/in/notes.usecase';

/**
 * Lectura **pública** de una nota (sin JWT). Solo responde si la nota está
 * marcada como pública y no fue archivada; el resto devuelve 404 para no
 * revelar si existe. Limitada por rate limit para evitar enumeración de IDs.
 */
@Controller('public/notes')
export class PublicNotesController {
  constructor(
    @Inject(NOTES_USECASE)
    private readonly notesUseCase: NotesUseCase,
  ) {}

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':id')
  async get(@Param('id') id: string) {
    const { note, author } = await this.notesUseCase.getPublicById(id);
    const data = note.toPrimitives();

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      pinned: data.pinned,
      is_public: data.is_public,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author,
    };
  }
}
