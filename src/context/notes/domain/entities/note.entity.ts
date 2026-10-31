import { randomUUID } from 'crypto';
import { MAX_NOTE_TITLE_LENGTH, NOTE_EXCERPT_LENGTH } from '../constants';

export interface NotePrimitives {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

/** Lightweight shape for the list (no full content). */
export interface NoteSummaryPrimitives {
  id: string;
  title: string;
  excerpt: string;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NoteCreateInput {
  user_id: string;
  title?: string;
  content?: string;
  pinned?: boolean;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  pinned?: boolean;
}

/** Enlace saliente de una nota, tal como quedó guardado. */
export interface NoteLinkPrimitives {
  source_note_id: string;
  target_note_id: string | null;
  raw_title: string;
  alias: string | null;
}

/** Quita la sintaxis Markdown para el extracto de la lista. */
export function noteExcerpt(
  markdown: string,
  maxLength = NOTE_EXCERPT_LENGTH,
): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, ' ')
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

const normalizeTitle = (title?: string): string =>
  (title ?? '').trim().slice(0, MAX_NOTE_TITLE_LENGTH);

/**
 * Nota personal en Markdown. El contenido se guarda **crudo** (sin HTML): el
 * render vive en el cliente, así que editar es barato y el contrato es estable.
 */
export class Note {
  private readonly id: string;
  private readonly user_id: string;
  private readonly title: string;
  private readonly content: string;
  private readonly pinned: boolean;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;

  constructor(
    id: string,
    user_id: string,
    title: string,
    content: string,
    pinned: boolean,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
  ) {
    this.id = id;
    this.user_id = user_id;
    this.title = title;
    this.content = content;
    this.pinned = pinned;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }

  static create(data: NoteCreateInput): Note {
    const now = new Date();
    return new Note(
      randomUUID(),
      data.user_id,
      normalizeTitle(data.title),
      data.content ?? '',
      data.pinned === true,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(primitives: NotePrimitives): Note {
    return new Note(
      primitives.id,
      primitives.user_id,
      primitives.title,
      primitives.content,
      primitives.pinned === true,
      primitives.created_at,
      primitives.updated_at,
      primitives.deleted_at ?? null,
    );
  }

  toPrimitives(): NotePrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      content: this.content,
      pinned: this.pinned,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  /** Payload de lista: sin contenido completo. */
  toSummary(): NoteSummaryPrimitives {
    return {
      id: this.id,
      title: this.title,
      excerpt: noteExcerpt(this.content),
      pinned: this.pinned,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getTitle(): string {
    return this.title;
  }

  getContent(): string {
    return this.content;
  }

  isPinned(): boolean {
    return this.pinned;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }

  getDeletedAt(): Date | null {
    return this.deleted_at;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  /** Reemplaza los campos editables y actualiza `updated_at`. */
  update(data: NoteUpdateInput): Note {
    return new Note(
      this.id,
      this.user_id,
      data.title !== undefined ? normalizeTitle(data.title) : this.title,
      data.content !== undefined ? data.content : this.content,
      data.pinned !== undefined ? data.pinned : this.pinned,
      this.created_at,
      new Date(),
      this.deleted_at,
    );
  }

  softDelete(): Note {
    const now = new Date();
    return new Note(
      this.id,
      this.user_id,
      this.title,
      this.content,
      this.pinned,
      this.created_at,
      now,
      now,
    );
  }

  restore(): Note {
    return new Note(
      this.id,
      this.user_id,
      this.title,
      this.content,
      this.pinned,
      this.created_at,
      new Date(),
      null,
    );
  }
}
