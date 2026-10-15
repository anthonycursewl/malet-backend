import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ExerciseRepository } from '../../domain/ports/out/exercise.repository';
import { Exercise } from '../../domain/entities/exercise.entity';
import { ListExercisesOptions } from '../../domain/types';

@Injectable()
export class ExerciseRepositoryAdapter implements ExerciseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Exercise {
    return Exercise.fromPrimitives({
      ...row,
      user_id: row.user_id ?? null,
      equipment: row.equipment ?? null,
      deleted_at: row.deleted_at ?? null,
    });
  }

  /** Global catalog rows plus the user's own exercises. */
  private visibility(user_id: string) {
    return [{ user_id: null }, { user_id }];
  }

  async save(exercise: Exercise): Promise<Exercise> {
    const data = exercise.toPrimitives();

    const created = await this.prisma.gym_exercises.create({
      data: {
        id: data.id,
        user_id: data.user_id ?? null,
        name: data.name,
        muscle_group: data.muscle_group,
        equipment: data.equipment ?? null,
        type: data.type,
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
  ): Promise<Exercise | null> {
    const row = await this.prisma.gym_exercises.findFirst({
      where: { id, OR: this.visibility(user_id) },
    });

    if (!row || (!include_deleted && row.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(row);
  }

  async findMany(options: ListExercisesOptions): Promise<Exercise[]> {
    const { user_id, take, cursor, search, muscle_group, type } = options;

    const rows = await this.prisma.gym_exercises.findMany({
      where: {
        deleted_at: null,
        OR: this.visibility(user_id),
        ...(muscle_group && { muscle_group }),
        ...(type && { type }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => this.toEntity(row));
  }

  async findByIds(user_id: string, ids: string[]): Promise<Exercise[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.gym_exercises.findMany({
      where: {
        id: { in: ids },
        deleted_at: null,
        OR: this.visibility(user_id),
      },
    });

    return rows.map((row) => this.toEntity(row));
  }

  async update(exercise: Exercise): Promise<Exercise> {
    const data = exercise.toPrimitives();

    const updated = await this.prisma.gym_exercises.update({
      where: { id: data.id },
      data: {
        name: data.name,
        muscle_group: data.muscle_group,
        equipment: data.equipment ?? null,
        type: data.type,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<Exercise> {
    const now = new Date();
    const deleted = await this.prisma.gym_exercises.update({
      where: { id },
      data: { deleted_at: now, updated_at: now },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Exercise> {
    const restored = await this.prisma.gym_exercises.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.gym_exercises.delete({ where: { id } });
  }

  async isUsedInRoutines(id: string): Promise<boolean> {
    const count = await this.prisma.gym_routine_exercises.count({
      where: { exercise_id: id },
    });

    return count > 0;
  }
}
