import { randomUUID } from 'crypto';

export interface SetEntryPrimitives {
  id: string;
  session_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  is_warmup: boolean;
  completed: boolean;
  duration_seconds: number | null;
  distance_meters: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SetEntryInput {
  set_number?: number;
  reps?: number | null;
  weight?: number | null;
  rpe?: number | null;
  is_warmup?: boolean;
  completed?: boolean;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}

export class SetEntry {
  private readonly id: string;
  private readonly session_exercise_id: string;
  private readonly set_number: number;
  private readonly reps: number | null;
  private readonly weight: number | null;
  private readonly rpe: number | null;
  private readonly is_warmup: boolean;
  private readonly completed: boolean;
  private readonly duration_seconds: number | null;
  private readonly distance_meters: number | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;

  constructor(data: SetEntryPrimitives) {
    this.id = data.id;
    this.session_exercise_id = data.session_exercise_id;
    this.set_number = data.set_number;
    this.reps = data.reps;
    this.weight = data.weight;
    this.rpe = data.rpe;
    this.is_warmup = data.is_warmup;
    this.completed = data.completed;
    this.duration_seconds = data.duration_seconds;
    this.distance_meters = data.distance_meters;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static create(
    data: SetEntryInput & { session_exercise_id: string; set_number: number },
  ): SetEntry {
    const now = new Date();
    return new SetEntry({
      id: randomUUID(),
      session_exercise_id: data.session_exercise_id,
      set_number: data.set_number,
      reps: data.reps ?? null,
      weight: data.weight ?? null,
      rpe: data.rpe ?? null,
      is_warmup: data.is_warmup ?? false,
      completed: data.completed ?? true,
      duration_seconds: data.duration_seconds ?? null,
      distance_meters: data.distance_meters ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  static fromPrimitives(primitives: SetEntryPrimitives): SetEntry {
    return new SetEntry({
      id: primitives.id,
      session_exercise_id: primitives.session_exercise_id,
      set_number: primitives.set_number,
      reps: primitives.reps ?? null,
      weight: primitives.weight == null ? null : Number(primitives.weight),
      rpe: primitives.rpe ?? null,
      is_warmup: primitives.is_warmup,
      completed: primitives.completed,
      duration_seconds: primitives.duration_seconds ?? null,
      distance_meters:
        primitives.distance_meters == null
          ? null
          : Number(primitives.distance_meters),
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
    });
  }

  toPrimitives(): SetEntryPrimitives {
    return {
      id: this.id,
      session_exercise_id: this.session_exercise_id,
      set_number: this.set_number,
      reps: this.reps,
      weight: this.weight,
      rpe: this.rpe,
      is_warmup: this.is_warmup,
      completed: this.completed,
      duration_seconds: this.duration_seconds,
      distance_meters: this.distance_meters,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getSessionExerciseId(): string {
    return this.session_exercise_id;
  }

  getSetNumber(): number {
    return this.set_number;
  }

  getReps(): number | null {
    return this.reps;
  }

  getWeight(): number | null {
    return this.weight;
  }

  getRpe(): number | null {
    return this.rpe;
  }

  isWarmup(): boolean {
    return this.is_warmup;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  getDurationSeconds(): number | null {
    return this.duration_seconds;
  }

  getDistanceMeters(): number | null {
    return this.distance_meters;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }
}
