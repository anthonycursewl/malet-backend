import { Note, NoteLinkPrimitives } from '../../entities/note.entity';
import { NoteGraph } from '../../graph';
import { NoteLinkTarget } from '../out/note.repository';
import { CreateNoteDto } from '../../../application/dtos/create-note.dto';
import { UpdateNoteDto } from '../../../application/dtos/update-note.dto';

export const NOTES_USECASE = Symbol('NOTES_USECASE');

export interface ListNotesFilters {
  user_id: string;
  take?: number;
  cursor?: string;
  search?: string;
}

export interface NoteDetailResult {
  note: Note;
  links: NoteLinkPrimitives[];
  backlinks: Note[];
}

export interface NotesUseCase {
  list(filters: ListNotesFilters): Promise<Note[]>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Note>;
  getDetail(user_id: string, id: string): Promise<NoteDetailResult>;
  linkTargets(
    user_id: string,
    search?: string,
    take?: number,
    exclude_id?: string,
  ): Promise<NoteLinkTarget[]>;
  graph(user_id: string, limit?: number): Promise<NoteGraph>;
  create(user_id: string, dto: CreateNoteDto): Promise<Note>;
  update(user_id: string, id: string, dto: UpdateNoteDto): Promise<Note>;
  softDelete(user_id: string, id: string): Promise<Note>;
  restore(user_id: string, id: string): Promise<Note>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
