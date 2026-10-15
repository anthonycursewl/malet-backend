import { randomUUID } from 'crypto';

export interface RoutineExercisePrimitives {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  target_weight: number | null;
  rest_seconds: number | null;
  superset_group: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RoutineExerciseInput {
  exercise_id: string;
  position?: number;
  sets?: number;
  reps_min?: number | null;
  reps_max?: number | null;
  target_weight?: number | null;
  rest_seconds?: number | null;
  superset_group?: string | null;
  notes?: string | null;
}

export class RoutineExercise {
  private readonly id: string;
  private readonly routine_day_id: string;
  private readonly exercise_id: string;
  private readonly position: number;
  private readonly sets: number;
  private readonly reps_min: number | null;
  private readonly reps_max: number | null;
  private readonly target_weight: number | null;
  private readonly rest_seconds: number | null;
  private readonly superset_group: string | null;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;

  constructor(data: RoutineExercisePrimitives) {
    this.id = data.id;
    this.routine_day_id = data.routine_day_id;
    this.exercise_id = data.exercise_id;
    this.position = data.position;
    this.sets = data.sets;
    this.reps_min = data.reps_min;
    this.reps_max = data.reps_max;
    this.target_weight = data.target_weight;
    this.rest_seconds = data.rest_seconds;
    this.superset_group = data.superset_group;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static create(
    data: RoutineExerciseInput & { routine_day_id: string },
  ): RoutineExercise {
    const now = new Date();
    return new RoutineExercise({
      id: randomUUID(),
      routine_day_id: data.routine_day_id,
      exercise_id: data.exercise_id,
      position: data.position ?? 1,
      sets: data.sets ?? 3,
      reps_min: data.reps_min ?? null,
      reps_max: data.reps_max ?? null,
      target_weight: data.target_weight ?? null,
      rest_seconds: data.rest_seconds ?? null,
      superset_group: data.superset_group ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  static fromPrimitives(
    primitives: RoutineExercisePrimitives,
  ): RoutineExercise {
    return new RoutineExercise({
      id: primitives.id,
      routine_day_id: primitives.routine_day_id,
      exercise_id: primitives.exercise_id,
      position: primitives.position,
      sets: primitives.sets,
      reps_min: primitives.reps_min ?? null,
      reps_max: primitives.reps_max ?? null,
      target_weight:
        primitives.target_weight == null
          ? null
          : Number(primitives.target_weight),
      rest_seconds: primitives.rest_seconds ?? null,
      superset_group: primitives.superset_group ?? null,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
    });
  }

  toPrimitives(): RoutineExercisePrimitives {
    return {
      id: this.id,
      routine_day_id: this.routine_day_id,
      exercise_id: this.exercise_id,
      position: this.position,
      sets: this.sets,
      reps_min: this.reps_min,
      reps_max: this.reps_max,
      target_weight: this.target_weight,
      rest_seconds: this.rest_seconds,
      superset_group: this.superset_group,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getRoutineDayId(): string {
    return this.routine_day_id;
  }

  getExerciseId(): string {
    return this.exercise_id;
  }

  getPosition(): number {
    return this.position;
  }

  getSets(): number {
    return this.sets;
  }

  getRepsMin(): number | null {
    return this.reps_min;
  }

  getRepsMax(): number | null {
    return this.reps_max;
  }

  getTargetWeight(): number | null {
    return this.target_weight;
  }

  getRestSeconds(): number | null {
    return this.rest_seconds;
  }

  getSupersetGroup(): string | null {
    return this.superset_group;
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
}
