import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma.service';
import {
  ListLinkTargetsOptions,
  ListNotesOptions,
  NoteLinkInput,
  NoteLinkTarget,
  NoteRepository,
} from '../../domain/ports/out/note.repository';
import { Note, NoteLinkPrimitives } from '../../domain/entities/note.entity';
import { NoteGraph } from '../../domain/graph';

@Injectable()
export class NoteRepositoryAdapter implements NoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Note {
    return Note.fromPrimitives({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      pinned: row.pinned === true,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(note: Note): Promise<Note> {
    const data = note.toPrimitives();

    const created = await this.prisma.notes.create({
      data: {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        content: data.content,
        pinned: data.pinned,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
      },
    });

    return this.toEntity(created);
  }

  async findById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Note | null> {
    const result = await this.prisma.notes.findFirst({
      where: { id, user_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findMany(options: ListNotesOptions): Promise<Note[]> {
    const { user_id, take, cursor, search } = options;

    const results = await this.prisma.notes.findMany({
      where: {
        user_id,
        deleted_at: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { content: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      take: take ?? 20,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      // Fijadas primero; luego las editadas más recientemente. `id` desempata.
      orderBy: [{ pinned: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(note: Note): Promise<Note> {
    const data = note.toPrimitives();

    const updated = await this.prisma.notes.update({
      where: { id: data.id },
      data: {
        title: data.title,
        content: data.content,
        pinned: data.pinned,
        updated_at: data.updated_at,
        deleted_at: data.deleted_at ?? null,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<Note> {
    const deleted = await this.prisma.notes.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Note> {
    const restored = await this.prisma.notes.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.notes.delete({ where: { id } });
  }

  async findByTitle(
    user_id: string,
    title: string,
    exclude_id?: string,
  ): Promise<Note | null> {
    const result = await this.prisma.notes.findFirst({
      where: {
        user_id,
        deleted_at: null,
        title: { equals: title.trim(), mode: 'insensitive' as const },
        ...(exclude_id && { id: { not: exclude_id } }),
      },
    });

    return result ? this.toEntity(result) : null;
  }

  async findTitles(user_id: string): Promise<NoteLinkTarget[]> {
    return this.prisma.notes.findMany({
      where: { user_id, deleted_at: null },
      select: { id: true, title: true },
    });
  }

  async findLinkTargets(
    options: ListLinkTargetsOptions,
  ): Promise<NoteLinkTarget[]> {
    const { user_id, search, take, exclude_id } = options;
    return this.prisma.notes.findMany({
      where: {
        user_id,
        deleted_at: null,
        ...(search && {
          title: { contains: search, mode: 'insensitive' as const },
        }),
        ...(exclude_id && { id: { not: exclude_id } }),
      },
      select: { id: true, title: true },
      take: take ?? 20,
      orderBy: [{ pinned: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    });
  }

  async replaceLinks(
    user_id: string,
    source_note_id: string,
    links: NoteLinkInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.note_links.deleteMany({ where: { source_note_id } });
      if (links.length === 0) return;

      await tx.note_links.createMany({
        data: links.map((link) => ({
          id: randomUUID(),
          user_id,
          source_note_id,
          target_note_id: link.target_note_id,
          raw_title: link.raw_title,
          alias: link.alias,
        })),
      });
    });
  }

  async findLinksBySource(
    user_id: string,
    source_note_id: string,
  ): Promise<NoteLinkPrimitives[]> {
    const rows = await this.prisma.note_links.findMany({
      where: { user_id, source_note_id },
      select: {
        source_note_id: true,
        target_note_id: true,
        raw_title: true,
        alias: true,
      },
    });

    return rows.map((row) => ({
      source_note_id: row.source_note_id,
      target_note_id: row.target_note_id ?? null,
      raw_title: row.raw_title,
      alias: row.alias ?? null,
    }));
  }

  async findBacklinks(
    user_id: string,
    target_note_id: string,
    take = 50,
  ): Promise<Note[]> {
    const rows = await this.prisma.notes.findMany({
      where: {
        user_id,
        deleted_at: null,
        outgoing_links: { some: { target_note_id } },
      },
      take,
      orderBy: [{ pinned: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    });

    return rows.map((row) => this.toEntity(row));
  }

  async resolvePendingLinks(
    user_id: string,
    title: string,
    target_note_id: string,
  ): Promise<number> {
    const result = await this.prisma.note_links.updateMany({
      where: {
        user_id,
        target_note_id: null,
        raw_title: { equals: title.trim(), mode: 'insensitive' as const },
      },
      data: { target_note_id },
    });

    return result.count;
  }

  async findSourceNotesByTarget(
    user_id: string,
    target_note_id: string,
    raw_title?: string,
  ): Promise<Note[]> {
    const rows = await this.prisma.notes.findMany({
      where: {
        user_id,
        deleted_at: null,
        outgoing_links: {
          some: {
            OR: [
              { target_note_id },
              ...(raw_title
                ? [
                    {
                      raw_title: {
                        equals: raw_title,
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      },
      take: 500,
      orderBy: [{ updated_at: 'desc' }],
    });

    return rows.map((row) => this.toEntity(row));
  }

  async getGraph(user_id: string, limit = 300): Promise<NoteGraph> {
    const notes = await this.prisma.notes.findMany({
      where: { user_id, deleted_at: null },
      select: { id: true, title: true, pinned: true },
      take: limit,
      orderBy: [{ pinned: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    });

    const ids = notes.map((note) => note.id);
    if (ids.length === 0) {
      return { nodes: [], edges: [], truncated: false };
    }

    const rows = await this.prisma.note_links.findMany({
      where: {
        user_id,
        source_note_id: { in: ids },
        target_note_id: { in: ids },
      },
      select: { source_note_id: true, target_note_id: true },
    });

    const edges = new Map<string, { source: string; target: string }>();
    for (const row of rows) {
      if (!row.target_note_id) continue;
      const key = `${row.source_note_id}:${row.target_note_id}`;
      if (!edges.has(key)) {
        edges.set(key, {
          source: row.source_note_id,
          target: row.target_note_id,
        });
      }
    }

    return {
      nodes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        pinned: note.pinned,
      })),
      edges: [...edges.values()],
      truncated: notes.length === limit,
    };
  }
}
