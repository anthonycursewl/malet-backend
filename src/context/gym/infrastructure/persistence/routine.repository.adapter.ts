import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RoutineRepository } from '../../domain/ports/out/routine.repository';
import { Routine } from '../../domain/entities/routine.entity';
import { RoutineDay } from '../../domain/entities/routine-day.entity';
import { ListRoutinesOptions } from '../../domain/types';

const DAYS_INCLUDE = {
  days: {
    orderBy: { day_of_week: 'asc' as const },
    include: { exercises: { orderBy: { position: 'asc' as const } } },
  },
};

@Injectable()
export class RoutineRepositoryAdapter implements RoutineRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Routine {
    return Routine.fromPrimitives({
      ...row,
      description: row.description ?? null,
      deleted_at: row.deleted_at ?? null,
      days: (row.days ?? []).map((day: any) => ({
        ...day,
        title: day.title ?? null,
        notes: day.notes ?? null,
        exercises: (day.exercises ?? []).map((exercise: any) => ({
          ...exercise,
          reps_min: exercise.reps_min ?? null,
          reps_max: exercise.reps_max ?? null,
          target_weight:
            exercise.target_weight == null
              ? null
              : Number(exercise.target_weight),
          rest_seconds: exercise.rest_seconds ?? null,
          superset_group: exercise.superset_group ?? null,
          notes: exercise.notes ?? null,
        })),
      })),
    });
  }

  private toDayEntity(row: any): RoutineDay {
    return RoutineDay.fromPrimitives({
      ...row,
      title: row.title ?? null,
      notes: row.notes ?? null,
      exercises: (row.exercises ?? []).map((exercise: any) => ({
        ...exercise,
        reps_min: exercise.reps_min ?? null,
        reps_max: exercise.reps_max ?? null,
        target_weight:
          exercise.target_weight == null
            ? null
            : Number(exercise.target_weight),
        rest_seconds: exercise.rest_seconds ?? null,
        superset_group: exercise.superset_group ?? null,
        notes: exercise.notes ?? null,
      })),
    });
  }

  async save(routine: Routine): Promise<Routine> {
    const data = routine.toPrimitives();

    const created = await this.prisma.gym_routines.create({
      data: {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        description: data.description ?? null,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
      },
      include: DAYS_INCLUDE,
    });

    return this.toEntity(created);
  }

  async findById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Routine | null> {
    const row = await this.prisma.gym_routines.findFirst({
      where: { id, user_id },
      include: DAYS_INCLUDE,
    });

    if (!row || (!include_deleted && row.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(row);
  }

  async findMany(options: ListRoutinesOptions): Promise<Routine[]> {
    const { user_id, take, cursor } = options;

    const rows = await this.prisma.gym_routines.findMany({
      where: { user_id, deleted_at: null },
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }, { id: 'asc' }],
      include: DAYS_INCLUDE,
    });

    return rows.map((row) => this.toEntity(row));
  }

  async findActive(user_id: string): Promise<Routine | null> {
    const row = await this.prisma.gym_routines.findFirst({
      where: { user_id, is_active: true, deleted_at: null },
      include: DAYS_INCLUDE,
    });

    return row ? this.toEntity(row) : null;
  }

  async findDayById(
    user_id: string,
    day_id: string,
  ): Promise<RoutineDay | null> {
    const row = await this.prisma.gym_routine_days.findFirst({
      where: {
        id: day_id,
        routine: { user_id, deleted_at: null },
      },
      include: { exercises: { orderBy: { position: 'asc' } } },
    });

    return row ? this.toDayEntity(row) : null;
  }

  async update(routine: Routine): Promise<Routine> {
    const data = routine.toPrimitives();

    const updated = await this.prisma.gym_routines.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description ?? null,
        updated_at: data.updated_at,
      },
      include: DAYS_INCLUDE,
    });

    return this.toEntity(updated);
  }

  async saveDay(day: RoutineDay): Promise<void> {
    const data = day.toPrimitives();

    await this.prisma.$transaction(async (tx) => {
      // Replaces the day as a whole (its exercises cascade with it).
      await tx.gym_routine_days.deleteMany({
        where: { routine_id: data.routine_id, day_of_week: data.day_of_week },
      });

      await tx.gym_routine_days.create({
        data: {
          id: data.id,
          routine_id: data.routine_id,
          day_of_week: data.day_of_week,
          title: data.title ?? null,
          is_rest: data.is_rest,
          notes: data.notes ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          exercises: {
            create: data.exercises.map((exercise) => ({
              id: exercise.id,
              exercise_id: exercise.exercise_id,
              position: exercise.position,
              sets: exercise.sets,
              reps_min: exercise.reps_min ?? null,
              reps_max: exercise.reps_max ?? null,
              target_weight: exercise.target_weight ?? null,
              rest_seconds: exercise.rest_seconds ?? null,
              superset_group: exercise.superset_group ?? null,
              notes: exercise.notes ?? null,
              created_at: exercise.created_at,
              updated_at: exercise.updated_at,
            })),
          },
        },
      });
    });
  }

  async deleteDay(routine_id: string, day_of_week: number): Promise<void> {
    await this.prisma.gym_routine_days.deleteMany({
      where: { routine_id, day_of_week },
    });
  }

  async setActive(user_id: string, routine_id: string): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.gym_routines.updateMany({
        where: { user_id, is_active: true, id: { not: routine_id } },
        data: { is_active: false, updated_at: now },
      }),
      this.prisma.gym_routines.update({
        where: { id: routine_id },
        data: { is_active: true, updated_at: now },
      }),
    ]);
  }

  async deactivate(routine_id: string): Promise<void> {
    await this.prisma.gym_routines.update({
      where: { id: routine_id },
      data: { is_active: false, updated_at: new Date() },
    });
  }

  async delete(id: string): Promise<Routine> {
    const now = new Date();
    const deleted = await this.prisma.gym_routines.update({
      where: { id },
      data: { deleted_at: now, updated_at: now },
      include: DAYS_INCLUDE,
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Routine> {
    const restored = await this.prisma.gym_routines.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
      include: DAYS_INCLUDE,
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.gym_routines.delete({ where: { id } });
  }

  async hasSessions(routine_id: string): Promise<boolean> {
    const count = await this.prisma.gym_sessions.count({
      where: { routine_id },
    });

    return count > 0;
  }
}
