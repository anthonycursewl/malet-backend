import { randomUUID } from 'crypto';
import { RoutineDay, RoutineDayPrimitives } from './routine-day.entity';

export interface RoutinePrimitives {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  days: RoutineDayPrimitives[];
}

/** Internal entity state: children are entities, not primitives. */
interface RoutineData extends Omit<RoutinePrimitives, 'days'> {
  days: RoutineDay[];
}

export class Routine {
  private readonly id: string;
  private readonly user_id: string;
  private readonly name: string;
  private readonly description: string | null;
  private readonly is_active: boolean;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;
  private readonly days: RoutineDay[];

  constructor(data: RoutineData) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.description = data.description;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
    this.days = data.days;
  }

  static create(data: {
    user_id: string;
    name: string;
    description?: string | null;
  }): Routine {
    const now = new Date();
    return new Routine({
      id: randomUUID(),
      user_id: data.user_id,
      name: data.name,
      description: data.description ?? null,
      is_active: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      days: [],
    });
  }

  static fromPrimitives(primitives: RoutinePrimitives): Routine {
    return new Routine({
      id: primitives.id,
      user_id: primitives.user_id,
      name: primitives.name,
      description: primitives.description ?? null,
      is_active: primitives.is_active,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at ?? null,
      days: (primitives.days ?? []).map((day) =>
        RoutineDay.fromPrimitives(day),
      ),
    });
  }

  toPrimitives(): RoutinePrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      description: this.description,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      days: this.days.map((day) => day.toPrimitives()),
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  isActive(): boolean {
    return this.is_active;
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

  getDays(): RoutineDay[] {
    return this.days;
  }

  getDay(day_of_week: number): RoutineDay | undefined {
    return this.days.find((day) => day.getDayOfWeek() === day_of_week);
  }

  update(data: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }): Routine {
    return new Routine({
      id: this.id,
      user_id: this.user_id,
      name: data.name !== undefined ? data.name : this.name,
      description:
        data.description !== undefined ? data.description : this.description,
      is_active: data.is_active !== undefined ? data.is_active : this.is_active,
      created_at: this.created_at,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
      days: this.days,
    });
  }
}
