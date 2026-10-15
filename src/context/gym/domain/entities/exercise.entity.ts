import { randomUUID } from 'crypto';
import { GymEquipment, GymExerciseType, GymMuscleGroup } from '../constants';

export interface ExercisePrimitives {
  id: string;
  /** `null` => system catalog shared by every user. */
  user_id: string | null;
  name: string;
  muscle_group: string;
  equipment: string | null;
  type: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class Exercise {
  private readonly id: string;
  private readonly user_id: string | null;
  private readonly name: string;
  private readonly muscle_group: string;
  private readonly equipment: string | null;
  private readonly type: string;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;

  constructor(data: ExercisePrimitives) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.muscle_group = data.muscle_group;
    this.equipment = data.equipment;
    this.type = data.type;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
  }

  static create(data: {
    user_id: string;
    name: string;
    muscle_group: GymMuscleGroup;
    equipment?: GymEquipment | null;
    type?: GymExerciseType;
  }): Exercise {
    const now = new Date();
    return new Exercise({
      id: randomUUID(),
      user_id: data.user_id,
      name: data.name,
      muscle_group: data.muscle_group,
      equipment: data.equipment ?? null,
      type: data.type ?? 'strength',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  static fromPrimitives(primitives: ExercisePrimitives): Exercise {
    return new Exercise({
      id: primitives.id,
      user_id: primitives.user_id ?? null,
      name: primitives.name,
      muscle_group: primitives.muscle_group,
      equipment: primitives.equipment ?? null,
      type: primitives.type,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at ?? null,
    });
  }

  toPrimitives(): ExercisePrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      muscle_group: this.muscle_group,
      equipment: this.equipment,
      type: this.type,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string | null {
    return this.user_id;
  }

  getName(): string {
    return this.name;
  }

  getMuscleGroup(): string {
    return this.muscle_group;
  }

  getEquipment(): string | null {
    return this.equipment;
  }

  getType(): string {
    return this.type;
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

  /** System catalog rows belong to nobody. */
  isGlobal(): boolean {
    return this.user_id === null;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  update(
    data: Partial<
      Pick<ExercisePrimitives, 'name' | 'muscle_group' | 'equipment' | 'type'>
    >,
  ): Exercise {
    return new Exercise({
      ...this.toPrimitives(),
      name: data.name !== undefined ? data.name : this.name,
      muscle_group:
        data.muscle_group !== undefined ? data.muscle_group : this.muscle_group,
      equipment: data.equipment !== undefined ? data.equipment : this.equipment,
      type: data.type !== undefined ? data.type : this.type,
      updated_at: new Date(),
    });
  }
}
