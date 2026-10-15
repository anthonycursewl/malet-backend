import { randomUUID } from 'crypto';
import {
  SetEntry,
  SetEntryInput,
  SetEntryPrimitives,
} from './set-entry.entity';

export interface SessionExercisePrimitives {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string | null;
  position: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  sets: SetEntryPrimitives[];
}

/** Internal entity state: children are entities, not primitives. */
interface SessionExerciseData extends Omit<SessionExercisePrimitives, 'sets'> {
  sets: SetEntry[];
}

/** Already-resolved data: the service fills the exercise snapshot before creating. */
export interface SessionExerciseCreateData {
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string | null;
  position: number;
  notes: string | null;
  sets: SetEntryInput[];
}

export class SessionExercise {
  private readonly id: string;
  private readonly session_id: string;
  private readonly exercise_id: string | null;
  private readonly exercise_name: string;
  private readonly muscle_group: string | null;
  private readonly position: number;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly sets: SetEntry[];

  constructor(data: SessionExerciseData) {
    this.id = data.id;
    this.session_id = data.session_id;
    this.exercise_id = data.exercise_id;
    this.exercise_name = data.exercise_name;
    this.muscle_group = data.muscle_group;
    this.position = data.position;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.sets = data.sets;
  }

  static create(data: SessionExerciseCreateData): SessionExercise {
    const id = randomUUID();
    const now = new Date();

    const sets = data.sets.map((set, index) =>
      SetEntry.create({
        ...set,
        session_exercise_id: id,
        set_number: set.set_number ?? index + 1,
      }),
    );

    return new SessionExercise({
      id,
      session_id: data.session_id,
      exercise_id: data.exercise_id,
      exercise_name: data.exercise_name,
      muscle_group: data.muscle_group,
      position: data.position,
      notes: data.notes,
      created_at: now,
      updated_at: now,
      sets,
    });
  }

  static fromPrimitives(
    primitives: SessionExercisePrimitives,
  ): SessionExercise {
    return new SessionExercise({
      id: primitives.id,
      session_id: primitives.session_id,
      exercise_id: primitives.exercise_id ?? null,
      exercise_name: primitives.exercise_name,
      muscle_group: primitives.muscle_group ?? null,
      position: primitives.position,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      sets: (primitives.sets ?? []).map((set) => SetEntry.fromPrimitives(set)),
    });
  }

  toPrimitives(): SessionExercisePrimitives {
    return {
      id: this.id,
      session_id: this.session_id,
      exercise_id: this.exercise_id,
      exercise_name: this.exercise_name,
      muscle_group: this.muscle_group,
      position: this.position,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      sets: this.sets.map((set) => set.toPrimitives()),
    };
  }

  getId(): string {
    return this.id;
  }

  getSessionId(): string {
    return this.session_id;
  }

  getExerciseId(): string | null {
    return this.exercise_id;
  }

  getExerciseName(): string {
    return this.exercise_name;
  }

  getMuscleGroup(): string | null {
    return this.muscle_group;
  }

  getPosition(): number {
    return this.position;
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

  getSets(): SetEntry[] {
    return this.sets;
  }
}
