import { randomUUID } from 'crypto';
import {
  RoutineExercise,
  RoutineExerciseInput,
  RoutineExercisePrimitives,
} from './routine-exercise.entity';

export interface RoutineDayPrimitives {
  id: string;
  routine_id: string;
  day_of_week: number;
  title: string | null;
  is_rest: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  exercises: RoutineExercisePrimitives[];
}

/** Internal entity state: children are entities, not primitives. */
interface RoutineDayData extends Omit<RoutineDayPrimitives, 'exercises'> {
  exercises: RoutineExercise[];
}

export class RoutineDay {
  private readonly id: string;
  private readonly routine_id: string;
  private readonly day_of_week: number;
  private readonly title: string | null;
  private readonly is_rest: boolean;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly exercises: RoutineExercise[];

  constructor(data: RoutineDayData) {
    this.id = data.id;
    this.routine_id = data.routine_id;
    this.day_of_week = data.day_of_week;
    this.title = data.title;
    this.is_rest = data.is_rest;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.exercises = data.exercises;
  }

  static create(data: {
    routine_id: string;
    day_of_week: number;
    title?: string | null;
    is_rest?: boolean;
    notes?: string | null;
    exercises?: RoutineExerciseInput[];
  }): RoutineDay {
    const id = randomUUID();
    const now = new Date();

    const exercises = (data.exercises ?? []).map((exercise, index) =>
      RoutineExercise.create({
        ...exercise,
        routine_day_id: id,
        position: exercise.position ?? index + 1,
      }),
    );

    return new RoutineDay({
      id,
      routine_id: data.routine_id,
      day_of_week: data.day_of_week,
      title: data.title ?? null,
      is_rest: data.is_rest ?? false,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      exercises,
    });
  }

  static fromPrimitives(primitives: RoutineDayPrimitives): RoutineDay {
    return new RoutineDay({
      id: primitives.id,
      routine_id: primitives.routine_id,
      day_of_week: primitives.day_of_week,
      title: primitives.title ?? null,
      is_rest: primitives.is_rest,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      exercises: (primitives.exercises ?? []).map((exercise) =>
        RoutineExercise.fromPrimitives(exercise),
      ),
    });
  }

  toPrimitives(): RoutineDayPrimitives {
    return {
      id: this.id,
      routine_id: this.routine_id,
      day_of_week: this.day_of_week,
      title: this.title,
      is_rest: this.is_rest,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      exercises: this.exercises.map((exercise) => exercise.toPrimitives()),
    };
  }

  getId(): string {
    return this.id;
  }

  getRoutineId(): string {
    return this.routine_id;
  }

  getDayOfWeek(): number {
    return this.day_of_week;
  }

  getTitle(): string | null {
    return this.title;
  }

  isRest(): boolean {
    return this.is_rest;
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

  getExercises(): RoutineExercise[] {
    return this.exercises;
  }

  update(data: {
    title?: string | null;
    is_rest?: boolean;
    notes?: string | null;
  }): RoutineDay {
    return new RoutineDay({
      id: this.id,
      routine_id: this.routine_id,
      day_of_week: this.day_of_week,
      title: data.title !== undefined ? data.title : this.title,
      is_rest: data.is_rest !== undefined ? data.is_rest : this.is_rest,
      notes: data.notes !== undefined ? data.notes : this.notes,
      created_at: this.created_at,
      updated_at: new Date(),
      exercises: this.exercises,
    });
  }

  /** Replaces every exercise of the day (positions default to the array order). */
  replaceExercises(inputs: RoutineExerciseInput[]): RoutineDay {
    const exercises = inputs.map((exercise, index) =>
      RoutineExercise.create({
        ...exercise,
        routine_day_id: this.id,
        position: exercise.position ?? index + 1,
      }),
    );

    return new RoutineDay({
      id: this.id,
      routine_id: this.routine_id,
      day_of_week: this.day_of_week,
      title: this.title,
      is_rest: this.is_rest,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: new Date(),
      exercises,
    });
  }
}
