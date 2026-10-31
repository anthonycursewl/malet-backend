import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListNotesFilters,
  NoteDetailResult,
  NotesUseCase,
} from '../domain/ports/in/notes.usecase';
import {
  NOTE_REPOSITORY_PORT,
  NoteLinkTarget,
  NoteRepository,
  PublicNoteResult,
} from '../domain/ports/out/note.repository';
import { Note } from '../domain/entities/note.entity';
import { NoteGraph } from '../domain/graph';
import { extractWikiLinks, rewriteWikiLinkTitle } from '../domain/wiki-links';
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

  async getDetail(user_id: string, id: string): Promise<NoteDetailResult> {
    const note = await this.getById(user_id, id);
    const [links, backlinks] = await Promise.all([
      this.noteRepository.findLinksBySource(user_id, note.getId()),
      this.noteRepository.findBacklinks(user_id, note.getId()),
    ]);

    return { note, links, backlinks };
  }

  async linkTargets(
    user_id: string,
    search?: string,
    take?: number,
    exclude_id?: string,
  ): Promise<NoteLinkTarget[]> {
    return this.noteRepository.findLinkTargets({
      user_id,
      search: search?.trim() || undefined,
      take,
      exclude_id,
    });
  }

  async graph(user_id: string, limit = 500): Promise<NoteGraph> {
    return this.noteRepository.getGraph(user_id, limit);
  }

  async getPublicById(id: string): Promise<PublicNoteResult> {
    const result = await this.noteRepository.findPublicById(id);
    if (!result) {
      throw new NotFoundException('Note not found');
    }
    return result;
  }

  async create(user_id: string, dto: CreateNoteDto): Promise<Note> {
    await this.assertTitleAvailable(user_id, dto.title);

    const note = await this.noteRepository.save(
      Note.create({
        user_id,
        title: dto.title,
        content: dto.content,
        pinned: dto.pinned,
        is_public: dto.is_public,
      }),
    );

    await this.syncLinks(note);
    await this.noteRepository.resolvePendingLinks(
      user_id,
      note.getTitle(),
      note.getId(),
    );

    return note;
  }

  async update(user_id: string, id: string, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.getById(user_id, id);

    if (dto.title !== undefined) {
      const nextTitle = dto.title.trim();
      const currentTitle = note.getTitle().trim();
      if (nextTitle && nextTitle.toLowerCase() !== currentTitle.toLowerCase()) {
        await this.assertTitleAvailable(user_id, nextTitle, note.getId());
      }
    }

    const oldTitle = note.getTitle();
    const contentChanged = dto.content !== undefined;
    const updated = await this.noteRepository.update(note.update(dto));
    const titleChanged =
      updated.getTitle().trim().toLowerCase() !== oldTitle.trim().toLowerCase();

    // El contenido cambia los enlaces; el título cambia los autoenlaces.
    if (contentChanged || titleChanged) {
      await this.syncLinks(updated);
    }

    if (titleChanged && oldTitle.trim()) {
      await this.rewriteBacklinks(
        user_id,
        updated.getId(),
        oldTitle,
        updated.getTitle(),
      );
    }

    if (updated.getTitle().trim()) {
      await this.noteRepository.resolvePendingLinks(
        user_id,
        updated.getTitle(),
        updated.getId(),
      );
    }

    return updated;
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

  /** Títulos únicos por usuario (case-insensitive; vacío se permite). */
  private async assertTitleAvailable(
    user_id: string,
    title?: string,
    exclude_id?: string,
  ): Promise<void> {
    const normalized = (title ?? '').trim();
    if (!normalized) return;

    const existing = await this.noteRepository.findByTitle(
      user_id,
      normalized,
      exclude_id,
    );
    if (existing) {
      throw new ConflictException('Ya existe una nota con ese título');
    }
  }

  /**
   * Recalcula los enlaces salientes: resuelve títulos en una sola lectura y
   * reemplaza las filas de la nota fuente. Ignora autoenlaces.
   */
  private async syncLinks(note: Note): Promise<void> {
    const selfTitle = note.getTitle().trim().toLowerCase();
    const parsed = extractWikiLinks(note.getContent()).filter(
      (link) => link.raw_title.trim().toLowerCase() !== selfTitle,
    );

    const targets = await this.noteRepository.findTitles(note.getUserId());
    const byTitle = new Map(
      targets.map((target) => [target.title.trim().toLowerCase(), target.id]),
    );

    await this.noteRepository.replaceLinks(
      note.getUserId(),
      note.getId(),
      parsed.map((link) => ({
        raw_title: link.raw_title,
        alias: link.alias,
        target_note_id: byTitle.get(link.raw_title.toLowerCase()) ?? null,
      })),
    );
  }

  /**
   * Al renombrar, reescribe `[[Viejo]]` → `[[Nuevo]]` en las notas que la
   * enlazan (preservando alias y sección) y recalcula sus enlaces.
   */
  private async rewriteBacklinks(
    user_id: string,
    note_id: string,
    old_title: string,
    new_title: string,
  ): Promise<void> {
    const sources = await this.noteRepository.findSourceNotesByTarget(
      user_id,
      note_id,
      old_title,
    );

    for (const source of sources) {
      const nextContent = rewriteWikiLinkTitle(
        source.getContent(),
        old_title,
        new_title,
      );
      if (nextContent === source.getContent()) continue;

      const updated = await this.noteRepository.update(
        source.update({ content: nextContent }),
      );
      await this.syncLinks(updated);
    }
  }
}
