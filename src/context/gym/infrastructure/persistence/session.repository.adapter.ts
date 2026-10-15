import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  FindSessionsOptions,
  SessionExerciseProgressOptions,
  SessionRangeOptions,
  SessionRecordsOptions,
  SessionRepository,
  SessionSummaryOptions,
  SessionVolumeSeriesOptions,
} from '../../domain/ports/out/session.repository';
import { WorkoutSession } from '../../domain/entities/workout-session.entity';
import {
  GymDailyVolume,
  GymExerciseProgressPoint,
  GymLoadDay,
  GymRecord,
  GymSummaryNumbers,
  GymVolumeSeriesPoint,
  MuscleGroupVolumePoint,
  WorkoutRange,
} from '../../domain/types';
import { round2 } from '../../domain/progress';

const SESSION_INCLUDE = {
  exercises: {
    orderBy: { position: 'asc' as const },
    include: { sets: { orderBy: { set_number: 'asc' as const } } },
  },
};

interface SessionAggregateRow {
  sessions_count: number;
  training_days: number;
  total_duration_minutes: number;
  average_rpe: string | null;
}

interface SetAggregateRow {
  total_sets: number;
  total_reps: number;
  total_volume: string;
}

interface VolumeRow {
  bucket: Date | string;
  sessions: number;
  sets: number;
  reps: number;
  volume: string;
}

interface RecordWeightRow {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  max_weight: string;
  max_weight_reps: number | null;
  achieved_at: Date | string | null;
}

interface RecordTotalsRow {
  exercise_id: string;
  estimated_1rm: string;
  best_set_volume: string;
}

interface MuscleGroupRow {
  muscle_group: string | null;
  volume: string;
  sets: number;
  reps: number;
  sessions: number;
}

interface DailyLoadRow {
  date: Date | string;
  sessions: number;
  duration_minutes: number;
  srpe: string;
}

interface DailyVolumeRow {
  date: Date | string;
  sessions: number;
  volume: string;
  session_id: string;
}

interface ExerciseProgressRow {
  date: Date | string;
  max_weight: string;
  estimated_1rm: string;
  volume: string;
  sets: number;
  reps: number;
}

@Injectable()
export class SessionRepositoryAdapter implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): WorkoutSession {
    return WorkoutSession.fromPrimitives({
      ...row,
      routine_id: row.routine_id ?? null,
      routine_day_id: row.routine_day_id ?? null,
      started_at: row.started_at ?? null,
      finished_at: row.finished_at ?? null,
      duration_minutes: row.duration_minutes ?? null,
      rpe: row.rpe ?? null,
      notes: row.notes ?? null,
      deleted_at: row.deleted_at ?? null,
      exercises: (row.exercises ?? []).map((exercise: any) => ({
        ...exercise,
        exercise_id: exercise.exercise_id ?? null,
        muscle_group: exercise.muscle_group ?? null,
        notes: exercise.notes ?? null,
        sets: (exercise.sets ?? []).map((set: any) => ({
          ...set,
          reps: set.reps ?? null,
          weight: set.weight == null ? null : Number(set.weight),
          rpe: set.rpe ?? null,
          duration_seconds: set.duration_seconds ?? null,
          distance_meters:
            set.distance_meters == null ? null : Number(set.distance_meters),
        })),
      })),
    });
  }

  private exercisesCreateData(exercises: any[]) {
    return exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exercise_id ?? null,
      exercise_name: exercise.exercise_name,
      muscle_group: exercise.muscle_group ?? null,
      position: exercise.position,
      notes: exercise.notes ?? null,
      created_at: exercise.created_at,
      updated_at: exercise.updated_at,
      sets: {
        create: exercise.sets.map((set: any) => ({
          id: set.id,
          set_number: set.set_number,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          rpe: set.rpe ?? null,
          is_warmup: set.is_warmup,
          completed: set.completed,
          duration_seconds: set.duration_seconds ?? null,
          distance_meters: set.distance_meters ?? null,
          created_at: set.created_at,
          updated_at: set.updated_at,
        })),
      },
    }));
  }

  async save(session: WorkoutSession): Promise<WorkoutSession> {
    const data = session.toPrimitives();

    const created = await this.prisma.gym_sessions.create({
      data: {
        id: data.id,
        user_id: data.user_id,
        routine_id: data.routine_id ?? null,
        routine_day_id: data.routine_day_id ?? null,
        date: data.date,
        status: data.status,
        started_at: data.started_at ?? null,
        finished_at: data.finished_at ?? null,
        duration_minutes: data.duration_minutes ?? null,
        rpe: data.rpe ?? null,
        notes: data.notes ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
        exercises: { create: this.exercisesCreateData(data.exercises) },
      },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(created);
  }

  async findById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<WorkoutSession | null> {
    const row = await this.prisma.gym_sessions.findFirst({
      where: { id, user_id },
      include: SESSION_INCLUDE,
    });

    if (!row || (!include_deleted && row.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(row);
  }

  async findMany(options: FindSessionsOptions): Promise<WorkoutSession[]> {
    const { user_id, take, cursor, routine_id, routine_day_id, status, range } =
      options;

    const where: Prisma.gym_sessionsWhereInput = {
      user_id,
      deleted_at: null,
      ...(routine_id && { routine_id }),
      ...(routine_day_id && { routine_day_id }),
      ...(status && { status }),
    };

    if (range) {
      where.date = range.inclusive
        ? { gte: range.from, lte: range.to }
        : { gte: range.from, lt: range.to };
    }

    const rows = await this.prisma.gym_sessions.findMany({
      where,
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => this.toEntity(row));
  }

  async update(session: WorkoutSession): Promise<WorkoutSession> {
    const data = session.toPrimitives();

    const updated = await this.prisma.gym_sessions.update({
      where: { id: data.id },
      data: {
        routine_id: data.routine_id ?? null,
        routine_day_id: data.routine_day_id ?? null,
        date: data.date,
        status: data.status,
        started_at: data.started_at ?? null,
        finished_at: data.finished_at ?? null,
        duration_minutes: data.duration_minutes ?? null,
        rpe: data.rpe ?? null,
        notes: data.notes ?? null,
        updated_at: data.updated_at,
        exercises: {
          deleteMany: {},
          create: this.exercisesCreateData(data.exercises),
        },
      },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<WorkoutSession> {
    const now = new Date();
    const deleted = await this.prisma.gym_sessions.update({
      where: { id },
      data: { deleted_at: now, updated_at: now },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<WorkoutSession> {
    const restored = await this.prisma.gym_sessions.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.gym_sessions.delete({ where: { id } });
  }

  async getSummaryNumbers(
    options: SessionSummaryOptions,
  ): Promise<GymSummaryNumbers> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const sessions = await this.prisma.$queryRaw<SessionAggregateRow[]>`
      SELECT
        COUNT(*)::int AS sessions_count,
        COUNT(DISTINCT g.date)::int AS training_days,
        COALESCE(SUM(g.duration_minutes), 0)::int AS total_duration_minutes,
        AVG(g.rpe)::text AS average_rpe
      FROM gym_sessions g
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        ${rangeClause}
    `;

    const sets = await this.prisma.$queryRaw<SetAggregateRow[]>`
      SELECT
        COUNT(s.id)::int AS total_sets,
        COALESCE(SUM(s.reps), 0)::int AS total_reps,
        COALESCE(SUM(s.reps * s.weight), 0)::text AS total_volume
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.reps IS NOT NULL
        AND s.weight IS NOT NULL
        ${rangeClause}
    `;

    const sessionRow = sessions[0];
    const setRow = sets[0];

    return {
      sessions_count: sessionRow?.sessions_count ?? 0,
      training_days: sessionRow?.training_days ?? 0,
      total_sets: setRow?.total_sets ?? 0,
      total_reps: setRow?.total_reps ?? 0,
      total_volume: Number(setRow?.total_volume ?? 0),
      total_duration_minutes: sessionRow?.total_duration_minutes ?? 0,
      average_rpe:
        sessionRow?.average_rpe == null
          ? null
          : round2(Number(sessionRow.average_rpe)),
    };
  }

  async getVolumeSeries(
    options: SessionVolumeSeriesOptions,
  ): Promise<GymVolumeSeriesPoint[]> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const rows = await this.prisma.$queryRaw<VolumeRow[]>`
      SELECT
        date_trunc(${options.period}::text, g.date::timestamp) AS bucket,
        COUNT(DISTINCT g.id)::int AS sessions,
        COUNT(s.id)::int AS sets,
        COALESCE(SUM(s.reps), 0)::int AS reps,
        COALESCE(SUM(s.reps * s.weight), 0)::text AS volume
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.reps IS NOT NULL
        AND s.weight IS NOT NULL
        ${rangeClause}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((row) => ({
      bucket: new Date(row.bucket).toISOString(),
      sessions: row.sessions,
      sets: row.sets,
      reps: row.reps,
      volume: Number(row.volume),
    }));
  }

  async getRecords(options: SessionRecordsOptions): Promise<GymRecord[]> {
    const muscleClause = options.muscle_group
      ? Prisma.sql` AND se.muscle_group = ${options.muscle_group}`
      : Prisma.empty;

    // Heaviest set per exercise (with the reps achieved at that weight).
    const weights = await this.prisma.$queryRaw<RecordWeightRow[]>`
      SELECT DISTINCT ON (se.exercise_id)
        se.exercise_id,
        se.exercise_name,
        se.muscle_group,
        s.weight::text AS max_weight,
        s.reps AS max_weight_reps,
        g.date AS achieved_at
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.weight IS NOT NULL
        AND s.reps IS NOT NULL
        AND se.exercise_id IS NOT NULL
        ${muscleClause}
      ORDER BY se.exercise_id, s.weight DESC, s.reps DESC, g.date DESC
    `;

    // Best estimated 1RM and best single-set volume per exercise.
    const totals = await this.prisma.$queryRaw<RecordTotalsRow[]>`
      SELECT
        se.exercise_id,
        MAX(s.weight * (1 + s.reps / 30.0))::text AS estimated_1rm,
        MAX(s.weight * s.reps)::text AS best_set_volume
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.weight IS NOT NULL
        AND s.reps IS NOT NULL
        AND se.exercise_id IS NOT NULL
        ${muscleClause}
      GROUP BY se.exercise_id
    `;

    const totalsById = new Map(
      totals.map((total) => [total.exercise_id, total]),
    );

    const records: GymRecord[] = weights.map((row) => {
      const total = totalsById.get(row.exercise_id);

      return {
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        muscle_group: row.muscle_group ?? null,
        max_weight: Number(row.max_weight),
        max_weight_reps: row.max_weight_reps ?? null,
        estimated_1rm: total ? Number(total.estimated_1rm) : 0,
        best_set_volume: total ? Number(total.best_set_volume) : 0,
        achieved_at: row.achieved_at ? new Date(row.achieved_at) : null,
      };
    });

    records.sort(
      (a, b) =>
        b.estimated_1rm - a.estimated_1rm || b.max_weight - a.max_weight,
    );

    const limit = options.limit ?? 50;
    return records.slice(0, limit);
  }

  /** Volume/sets/reps grouped by the muscle-group snapshot of each exercise. */
  async getMuscleGroupVolume(
    options: SessionRangeOptions,
  ): Promise<MuscleGroupVolumePoint[]> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const rows = await this.prisma.$queryRaw<MuscleGroupRow[]>`
      SELECT
        se.muscle_group,
        COALESCE(SUM(s.reps * s.weight), 0)::text AS volume,
        COUNT(s.id)::int AS sets,
        COALESCE(SUM(s.reps), 0)::int AS reps,
        COUNT(DISTINCT g.id)::int AS sessions
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.reps IS NOT NULL
        AND s.weight IS NOT NULL
        ${rangeClause}
      GROUP BY se.muscle_group
      ORDER BY COALESCE(SUM(s.reps * s.weight), 0) DESC
    `;

    return rows.map((row) => ({
      muscle_group: row.muscle_group ?? null,
      volume: Number(row.volume),
      sets: row.sets,
      reps: row.reps,
      sessions: row.sessions,
    }));
  }

  /** Per-day internal load: `sRPE = Σ (rpe × duration_minutes)`. */
  async getDailyLoad(options: SessionRangeOptions): Promise<GymLoadDay[]> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const rows = await this.prisma.$queryRaw<DailyLoadRow[]>`
      SELECT
        g.date::date AS date,
        COUNT(*)::int AS sessions,
        COALESCE(SUM(g.duration_minutes), 0)::int AS duration_minutes,
        COALESCE(SUM(COALESCE(g.rpe, 0) * COALESCE(g.duration_minutes, 0)), 0)::text AS srpe
      FROM gym_sessions g
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        ${rangeClause}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((row) => ({
      date: this.toDateOnly(new Date(row.date)),
      sessions: row.sessions,
      duration_minutes: row.duration_minutes,
      srpe: Number(row.srpe),
    }));
  }

  /** Per-day aggregated volume (warm-up sets excluded), used by the calendar. */
  async getDailyVolume(
    options: SessionRangeOptions,
  ): Promise<GymDailyVolume[]> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const rows = await this.prisma.$queryRaw<DailyVolumeRow[]>`
      SELECT
        g.date::date AS date,
        COUNT(DISTINCT g.id)::int AS sessions,
        COALESCE(
          SUM(
            CASE
              WHEN s.is_warmup = false AND s.completed = true
              THEN s.reps * s.weight
              ELSE 0
            END
          ),
          0
        )::text AS volume,
        (ARRAY_AGG(g.id ORDER BY g.created_at ASC))[1] AS session_id
      FROM gym_sessions g
      LEFT JOIN gym_session_exercises se ON se.session_id = g.id
      LEFT JOIN gym_sets s ON s.session_exercise_id = se.id
      WHERE g.user_id = ${options.user_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        ${rangeClause}
      GROUP BY g.date
      ORDER BY g.date
    `;

    return rows.map((row) => ({
      date: this.toDateOnly(new Date(row.date)),
      sessions: row.sessions,
      volume: Number(row.volume),
      session_id: row.session_id,
    }));
  }

  /** Per-session best weight, estimated 1RM and volume of one exercise. */
  async getExerciseProgress(
    options: SessionExerciseProgressOptions,
  ): Promise<GymExerciseProgressPoint[]> {
    const rangeClause = this.rangeClause('g.date', options.range);

    const rows = await this.prisma.$queryRaw<ExerciseProgressRow[]>`
      SELECT
        g.date::date AS date,
        MAX(s.weight)::text AS max_weight,
        MAX(s.weight * (1 + s.reps / 30.0))::text AS estimated_1rm,
        COALESCE(SUM(s.reps * s.weight), 0)::text AS volume,
        COUNT(s.id)::int AS sets,
        COALESCE(SUM(s.reps), 0)::int AS reps
      FROM gym_sets s
      JOIN gym_session_exercises se ON se.id = s.session_exercise_id
      JOIN gym_sessions g ON g.id = se.session_id
      WHERE g.user_id = ${options.user_id}
        AND se.exercise_id = ${options.exercise_id}
        AND g.deleted_at IS NULL
        AND g.status = 'completed'
        AND s.is_warmup = false
        AND s.completed = true
        AND s.reps IS NOT NULL
        AND s.weight IS NOT NULL
        ${rangeClause}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((row) => ({
      date: this.toDateOnly(new Date(row.date)),
      max_weight: Number(row.max_weight),
      estimated_1rm: Number(row.estimated_1rm),
      volume: Number(row.volume),
      sets: row.sets,
      reps: row.reps,
    }));
  }

  /**
   * Range filter over a `date` column. The boundaries travel as `YYYY-MM-DD`
   * strings so PostgreSQL compares dates without timezone conversions.
   */
  private rangeClause(column: string, range?: WorkoutRange): Prisma.Sql {
    if (!range) {
      return Prisma.empty;
    }

    const target = Prisma.raw(column);
    const operator = Prisma.raw(range.inclusive ? '<=' : '<');

    return Prisma.sql` AND ${target} >= ${this.toDateOnly(range.from)}::date AND ${target} ${operator} ${this.toDateOnly(range.to)}::date`;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
