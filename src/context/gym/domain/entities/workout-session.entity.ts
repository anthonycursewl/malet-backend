import { randomUUID } from 'crypto';
import { GymSessionStatus } from '../constants';
import {
  SessionExercise,
  SessionExerciseCreateData,
  SessionExercisePrimitives,
} from './session-exercise.entity';

export interface WorkoutSessionPrimitives {
  id: string;
  user_id: string;
  routine_id: string | null;
  routine_day_id: string | null;
  date: Date;
  status: string;
  started_at: Date | null;
  finished_at: Date | null;
  duration_minutes: number | null;
  rpe: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  exercises: SessionExercisePrimitives[];
}

/** Internal entity state: children are entities, not primitives. */
interface WorkoutSessionData extends Omit<
  WorkoutSessionPrimitives,
  'exercises'
> {
  exercises: SessionExercise[];
}

/** Already-resolved data: the service fills the exercise snapshots before creating. */
export interface WorkoutSessionCreateData {
  user_id: string;
  routine_id: string | null;
  routine_day_id: string | null;
  date: Date;
  status: GymSessionStatus;
  started_at: Date | null;
  finished_at: Date | null;
  duration_minutes: number | null;
  rpe: number | null;
  notes: string | null;
  exercises: SessionExerciseInput[];
}

/** An exercise of the session before it is attached to a session id. */
export type SessionExerciseInput = Omit<
  SessionExerciseCreateData,
  'session_id'
>;

export class WorkoutSession {
  private readonly id: string;
  private readonly user_id: string;
  private readonly routine_id: string | null;
  private readonly routine_day_id: string | null;
  private readonly date: Date;
  private readonly status: string;
  private readonly started_at: Date | null;
  private readonly finished_at: Date | null;
  private readonly duration_minutes: number | null;
  private readonly rpe: number | null;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;
  private readonly exercises: SessionExercise[];

  constructor(data: WorkoutSessionData) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.routine_id = data.routine_id;
    this.routine_day_id = data.routine_day_id;
    this.date = data.date;
    this.status = data.status;
    this.started_at = data.started_at;
    this.finished_at = data.finished_at;
    this.duration_minutes = data.duration_minutes;
    this.rpe = data.rpe;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
    this.exercises = data.exercises;
  }

  static create(data: WorkoutSessionCreateData): WorkoutSession {
    const id = randomUUID();
    const now = new Date();

    const exercises = data.exercises.map((exercise) =>
      SessionExercise.create({ ...exercise, session_id: id }),
    );

    return new WorkoutSession({
      id,
      user_id: data.user_id,
      routine_id: data.routine_id,
      routine_day_id: data.routine_day_id,
      date: data.date,
      status: data.status,
      started_at: data.started_at,
      finished_at: data.finished_at,
      duration_minutes: data.duration_minutes,
      rpe: data.rpe,
      notes: data.notes,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      exercises,
    });
  }

  static fromPrimitives(primitives: WorkoutSessionPrimitives): WorkoutSession {
    return new WorkoutSession({
      id: primitives.id,
      user_id: primitives.user_id,
      routine_id: primitives.routine_id ?? null,
      routine_day_id: primitives.routine_day_id ?? null,
      date: primitives.date,
      status: primitives.status,
      started_at: primitives.started_at ?? null,
      finished_at: primitives.finished_at ?? null,
      duration_minutes: primitives.duration_minutes ?? null,
      rpe: primitives.rpe ?? null,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at ?? null,
      exercises: (primitives.exercises ?? []).map((exercise) =>
        SessionExercise.fromPrimitives(exercise),
      ),
    });
  }

  toPrimitives(): WorkoutSessionPrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      routine_id: this.routine_id,
      routine_day_id: this.routine_day_id,
      date: this.date,
      status: this.status,
      started_at: this.started_at,
      finished_at: this.finished_at,
      duration_minutes: this.duration_minutes,
      rpe: this.rpe,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      exercises: this.exercises.map((exercise) => exercise.toPrimitives()),
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getRoutineId(): string | null {
    return this.routine_id;
  }

  getRoutineDayId(): string | null {
    return this.routine_day_id;
  }

  getDate(): Date {
    return this.date;
  }

  getStatus(): string {
    return this.status;
  }

  getStartedAt(): Date | null {
    return this.started_at;
  }

  getFinishedAt(): Date | null {
    return this.finished_at;
  }

  getDurationMinutes(): number | null {
    return this.duration_minutes;
  }

  getRpe(): number | null {
    return this.rpe;
  }

  getNotes(): string | null {
    return this.notes;
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

  getExercises(): SessionExercise[] {
    return this.exercises;
  }

  update(data: {
    routine_id?: string | null;
    routine_day_id?: string | null;
    date?: Date;
    status?: GymSessionStatus;
    started_at?: Date | null;
    finished_at?: Date | null;
    duration_minutes?: number | null;
    rpe?: number | null;
    notes?: string | null;
  }): WorkoutSession {
    return new WorkoutSession({
      id: this.id,
      user_id: this.user_id,
      routine_id:
        data.routine_id !== undefined ? data.routine_id : this.routine_id,
      routine_day_id:
        data.routine_day_id !== undefined
          ? data.routine_day_id
          : this.routine_day_id,
      date: data.date !== undefined ? data.date : this.date,
      status: data.status !== undefined ? data.status : this.status,
      started_at:
        data.started_at !== undefined ? data.started_at : this.started_at,
      finished_at:
        data.finished_at !== undefined ? data.finished_at : this.finished_at,
      duration_minutes:
        data.duration_minutes !== undefined
          ? data.duration_minutes
          : this.duration_minutes,
      rpe: data.rpe !== undefined ? data.rpe : this.rpe,
      notes: data.notes !== undefined ? data.notes : this.notes,
      created_at: this.created_at,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
      exercises: this.exercises,
    });
  }

  /** Replaces every logged exercise (positions default to the array order). */
  replaceExercises(exercises: SessionExerciseInput[]): WorkoutSession {
    const resolved = exercises.map((exercise, index) =>
      SessionExercise.create({
        ...exercise,
        session_id: this.id,
        position: exercise.position ?? index + 1,
      }),
    );

    return new WorkoutSession({
      id: this.id,
      user_id: this.user_id,
      routine_id: this.routine_id,
      routine_day_id: this.routine_day_id,
      date: this.date,
      status: this.status,
      started_at: this.started_at,
      finished_at: this.finished_at,
      duration_minutes: this.duration_minutes,
      rpe: this.rpe,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
      exercises: resolved,
    });
  }
}
