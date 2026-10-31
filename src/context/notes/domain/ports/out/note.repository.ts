import { Note, NoteLinkPrimitives } from '../../entities/note.entity';
import { NoteGraph } from '../../graph';

export const NOTE_REPOSITORY_PORT = Symbol('NOTE_REPOSITORY_PORT');

export interface ListNotesOptions {
  user_id: string;
  take?: number;
  cursor?: string;
  search?: string;
}

export interface NoteLinkInput {
  raw_title: string;
  alias: string | null;
  target_note_id: string | null;
}

export interface NoteLinkTarget {
  id: string;
  title: string;
}

/** Autor visible en la página pública de una nota. */
export interface PublicNoteAuthor {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
}

export interface PublicNoteResult {
  note: Note;
  author: PublicNoteAuthor;
}

export interface ListLinkTargetsOptions {
  user_id: string;
  search?: string;
  take?: number;
  exclude_id?: string;
}

export interface NoteRepository {
  save(note: Note): Promise<Note>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Note | null>;
  findMany(options: ListNotesOptions): Promise<Note[]>;
  /** Nota pública (no borrada) + autor; `null` si no es visible. */
  findPublicById(id: string): Promise<PublicNoteResult | null>;
  update(note: Note): Promise<Note>;
  delete(id: string): Promise<Note>;
  restore(id: string): Promise<Note>;
  hardDelete(id: string): Promise<void>;

  /** Comprueba títulos únicos (case-insensitive). */
  findByTitle(
    user_id: string,
    title: string,
    exclude_id?: string,
  ): Promise<Note | null>;

  /** Títulos del usuario para resolver `[[...]]` sin N+1. */
  findTitles(user_id: string): Promise<NoteLinkTarget[]>;

  /** Búsqueda liviana para el picker de enlaces. */
  findLinkTargets(options: ListLinkTargetsOptions): Promise<NoteLinkTarget[]>;

  /** Reemplaza todos los enlaces salientes de una nota. */
  replaceLinks(
    user_id: string,
    source_note_id: string,
    links: NoteLinkInput[],
  ): Promise<void>;

  findLinksBySource(
    user_id: string,
    source_note_id: string,
  ): Promise<NoteLinkPrimitives[]>;

  /** Notas que enlazan a `target_note_id`. */
  findBacklinks(
    user_id: string,
    target_note_id: string,
    take?: number,
  ): Promise<Note[]>;

  /** Resuelve enlaces pendientes cuando aparece/renombra una nota. */
  resolvePendingLinks(
    user_id: string,
    title: string,
    target_note_id: string,
  ): Promise<number>;

  /** Notas fuente que enlazan a una nota (para reescribir al renombrar). */
  findSourceNotesByTarget(
    user_id: string,
    target_note_id: string,
    raw_title?: string,
  ): Promise<Note[]>;

  /** Nodos y aristas del mapa de conocimiento. */
  getGraph(user_id: string, limit?: number): Promise<NoteGraph>;
}
