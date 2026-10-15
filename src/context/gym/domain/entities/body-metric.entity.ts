import { randomUUID } from 'crypto';
import { round2 } from '../progress';

export interface BodyMetricPrimitives {
  id: string;
  user_id: string;
  date: Date;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  height_cm: number | null;
  /** Tape measurements in cm, e.g. `{ chest: 102, waist: 84 }`. */
  measurements: Record<string, number> | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  /** Computed: weight / (height / 100)^2. */
  bmi?: number | null;
}

export class BodyMetric {
  private readonly id: string;
  private readonly user_id: string;
  private readonly date: Date;
  private readonly weight_kg: number | null;
  private readonly body_fat_pct: number | null;
  private readonly muscle_mass_kg: number | null;
  private readonly height_cm: number | null;
  private readonly measurements: Record<string, number> | null;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;

  constructor(data: BodyMetricPrimitives) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.date = data.date;
    this.weight_kg = data.weight_kg;
    this.body_fat_pct = data.body_fat_pct;
    this.muscle_mass_kg = data.muscle_mass_kg;
    this.height_cm = data.height_cm;
    this.measurements = data.measurements;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
  }

  static create(data: {
    user_id: string;
    date: Date;
    weight_kg?: number | null;
    body_fat_pct?: number | null;
    muscle_mass_kg?: number | null;
    height_cm?: number | null;
    measurements?: Record<string, number> | null;
    notes?: string | null;
  }): BodyMetric {
    const now = new Date();
    return new BodyMetric({
      id: randomUUID(),
      user_id: data.user_id,
      date: data.date,
      weight_kg: data.weight_kg ?? null,
      body_fat_pct: data.body_fat_pct ?? null,
      muscle_mass_kg: data.muscle_mass_kg ?? null,
      height_cm: data.height_cm ?? null,
      measurements: data.measurements ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  static fromPrimitives(primitives: BodyMetricPrimitives): BodyMetric {
    return new BodyMetric({
      id: primitives.id,
      user_id: primitives.user_id,
      date: primitives.date,
      weight_kg:
        primitives.weight_kg == null ? null : Number(primitives.weight_kg),
      body_fat_pct:
        primitives.body_fat_pct == null
          ? null
          : Number(primitives.body_fat_pct),
      muscle_mass_kg:
        primitives.muscle_mass_kg == null
          ? null
          : Number(primitives.muscle_mass_kg),
      height_cm:
        primitives.height_cm == null ? null : Number(primitives.height_cm),
      measurements: primitives.measurements ?? null,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at ?? null,
    });
  }

  toPrimitives(): BodyMetricPrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      date: this.date,
      weight_kg: this.weight_kg,
      body_fat_pct: this.body_fat_pct,
      muscle_mass_kg: this.muscle_mass_kg,
      height_cm: this.height_cm,
      measurements: this.measurements,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      bmi: this.getBmi(),
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getDate(): Date {
    return this.date;
  }

  getWeightKg(): number | null {
    return this.weight_kg;
  }

  getBodyFatPct(): number | null {
    return this.body_fat_pct;
  }

  getMuscleMassKg(): number | null {
    return this.muscle_mass_kg;
  }

  getHeightCm(): number | null {
    return this.height_cm;
  }

  getMeasurements(): Record<string, number> | null {
    return this.measurements;
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

  /** Body mass index, only available when weight and height are present. */
  getBmi(): number | null {
    if (!this.weight_kg || !this.height_cm) {
      return null;
    }

    const heightMeters = this.height_cm / 100;
    return round2(this.weight_kg / (heightMeters * heightMeters));
  }

  /** Brings a soft-deleted daily entry back to life. */
  restore(): BodyMetric {
    return new BodyMetric({
      ...this.toPrimitives(),
      deleted_at: null,
      updated_at: new Date(),
    });
  }

  update(
    data: Partial<{
      weight_kg: number | null;
      body_fat_pct: number | null;
      muscle_mass_kg: number | null;
      height_cm: number | null;
      measurements: Record<string, number> | null;
      notes: string | null;
    }>,
  ): BodyMetric {
    return new BodyMetric({
      ...this.toPrimitives(),
      weight_kg: data.weight_kg !== undefined ? data.weight_kg : this.weight_kg,
      body_fat_pct:
        data.body_fat_pct !== undefined ? data.body_fat_pct : this.body_fat_pct,
      muscle_mass_kg:
        data.muscle_mass_kg !== undefined
          ? data.muscle_mass_kg
          : this.muscle_mass_kg,
      height_cm: data.height_cm !== undefined ? data.height_cm : this.height_cm,
      measurements:
        data.measurements !== undefined ? data.measurements : this.measurements,
      notes: data.notes !== undefined ? data.notes : this.notes,
      updated_at: new Date(),
    });
  }
}
