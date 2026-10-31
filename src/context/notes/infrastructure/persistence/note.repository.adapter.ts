import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ListNotesOptions,
  NoteRepository,
} from '../../domain/ports/out/note.repository';
import { Note } from '../../domain/entities/note.entity';

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
}
