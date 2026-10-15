import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  BodyMetricRepository,
  BodyMetricTrendOptions,
  ListBodyMetricsOptions,
} from '../../domain/ports/out/body-metric.repository';
import { BodyMetric } from '../../domain/entities/body-metric.entity';
import { BodyMetricTrendPoint, WorkoutRange } from '../../domain/types';

@Injectable()
export class BodyMetricRepositoryAdapter implements BodyMetricRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): BodyMetric {
    return BodyMetric.fromPrimitives({
      ...row,
      weight_kg: row.weight_kg == null ? null : Number(row.weight_kg),
      body_fat_pct: row.body_fat_pct == null ? null : Number(row.body_fat_pct),
      muscle_mass_kg:
        row.muscle_mass_kg == null ? null : Number(row.muscle_mass_kg),
      height_cm: row.height_cm == null ? null : Number(row.height_cm),
      measurements: (row.measurements as Record<string, number> | null) ?? null,
      notes: row.notes ?? null,
      deleted_at: row.deleted_at ?? null,
    });
  }

  private toJson(
    measurements: Record<string, number> | null,
    forUpdate: boolean,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (measurements == null) {
      return forUpdate ? Prisma.DbNull : undefined;
    }
    return measurements as Prisma.InputJsonValue;
  }

  private dateFilter(range?: WorkoutRange) {
    if (!range) {
      return undefined;
    }
    return range.inclusive
      ? { gte: range.from, lte: range.to }
      : { gte: range.from, lt: range.to };
  }

  async save(metric: BodyMetric): Promise<BodyMetric> {
    const data = metric.toPrimitives();

    const created = await this.prisma.gym_body_metrics.create({
      data: {
        id: data.id,
        user_id: data.user_id,
        date: data.date,
        weight_kg: data.weight_kg ?? null,
        body_fat_pct: data.body_fat_pct ?? null,
        muscle_mass_kg: data.muscle_mass_kg ?? null,
        height_cm: data.height_cm ?? null,
        measurements: this.toJson(data.measurements, false),
        notes: data.notes ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
      },
    });

    return this.toEntity(created);
  }

  async findByDate(user_id: string, date: Date): Promise<BodyMetric | null> {
    // Deleted rows still own the date (unique constraint), so they are revived.
    const row = await this.prisma.gym_body_metrics.findFirst({
      where: { user_id, date },
    });

    return row ? this.toEntity(row) : null;
  }

  async findById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<BodyMetric | null> {
    const row = await this.prisma.gym_body_metrics.findFirst({
      where: { id, user_id },
    });

    if (!row || (!include_deleted && row.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(row);
  }

  async findMany(options: ListBodyMetricsOptions): Promise<BodyMetric[]> {
    const { user_id, take, cursor, range } = options;

    const rows = await this.prisma.gym_body_metrics.findMany({
      where: {
        user_id,
        deleted_at: null,
        ...(range && { date: this.dateFilter(range) }),
      },
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return rows.map((row) => this.toEntity(row));
  }

  async findLatest(user_id: string): Promise<BodyMetric | null> {
    const row = await this.prisma.gym_body_metrics.findFirst({
      where: { user_id, deleted_at: null },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });

    return row ? this.toEntity(row) : null;
  }

  async findTrend(
    options: BodyMetricTrendOptions,
  ): Promise<BodyMetricTrendPoint[]> {
    const rows = await this.prisma.gym_body_metrics.findMany({
      where: {
        user_id: options.user_id,
        deleted_at: null,
        ...(options.range && { date: this.dateFilter(options.range) }),
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    return rows
      .map((row) => ({
        date: row.date,
        value: (row as Record<string, unknown>)[options.metric] as unknown,
      }))
      .filter((point) => point.value != null)
      .map((point) => ({
        date: point.date,
        value: Number(point.value),
      }));
  }

  async update(metric: BodyMetric): Promise<BodyMetric> {
    const data = metric.toPrimitives();

    const updated = await this.prisma.gym_body_metrics.update({
      where: { id: data.id },
      data: {
        weight_kg: data.weight_kg ?? null,
        body_fat_pct: data.body_fat_pct ?? null,
        muscle_mass_kg: data.muscle_mass_kg ?? null,
        height_cm: data.height_cm ?? null,
        measurements: this.toJson(data.measurements, true),
        notes: data.notes ?? null,
        updated_at: data.updated_at,
        deleted_at: data.deleted_at ?? null,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<BodyMetric> {
    const now = new Date();
    const deleted = await this.prisma.gym_body_metrics.update({
      where: { id },
      data: { deleted_at: now, updated_at: now },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<BodyMetric> {
    const restored = await this.prisma.gym_body_metrics.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.gym_body_metrics.delete({ where: { id } });
  }
}
