import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ListNotesFilters,
  NOTES_USECASE,
  NotesUseCase,
} from '../domain/ports/in/notes.usecase';
import {
  NOTE_REPOSITORY_PORT,
  NoteRepository,
} from '../domain/ports/out/note.repository';
import { Note } from '../domain/entities/note.entity';
import { CreateNoteDto } from './dtos/create-note.dto';
import { UpdateNoteDto } from './dtos/update-note.dto';

@Injectable()
export class NotesService implements NotesUseCase {
  constructor(
    @Inject(NOTE_REPOSITORY_PORT)
    private readonly noteRepository: NoteRepository,
  ) {}

  async list(filters: ListNotesFilters): Promise<Note[]> {
    return this.noteRepository.findMany({
      user_id: filters.user_id,
      take: filters.take,
      cursor: filters.cursor,
      search: filters.search?.trim() || undefined,
    });
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Note> {
    const note = await this.noteRepository.findById(
      user_id,
      id,
      include_deleted,
    );
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async create(user_id: string, dto: CreateNoteDto): Promise<Note> {
    return this.noteRepository.save(
      Note.create({
        user_id,
        title: dto.title,
        content: dto.content,
        pinned: dto.pinned,
      }),
    );
  }

  async update(user_id: string, id: string, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.getById(user_id, id);
    return this.noteRepository.update(note.update(dto));
  }

  async softDelete(user_id: string, id: string): Promise<Note> {
    const note = await this.getById(user_id, id);
    return this.noteRepository.update(note.softDelete());
  }

  async restore(user_id: string, id: string): Promise<Note> {
    const note = await this.getById(user_id, id, true);
    return this.noteRepository.update(note.restore());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const note = await this.getById(user_id, id, true);
    await this.noteRepository.hardDelete(note.getId());
  }
}
