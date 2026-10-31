import { Note } from '../../entities/note.entity';

export const NOTE_REPOSITORY_PORT = Symbol('NOTE_REPOSITORY_PORT');

export interface ListNotesOptions {
  user_id: string;
  take?: number;
  cursor?: string;
  search?: string;
}

export interface NoteRepository {
  save(note: Note): Promise<Note>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Note | null>;
  findMany(options: ListNotesOptions): Promise<Note[]>;
  update(note: Note): Promise<Note>;
  delete(id: string): Promise<Note>;
  restore(id: string): Promise<Note>;
  hardDelete(id: string): Promise<void>;
}
