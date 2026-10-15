import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BodyMetricTrendQuery,
  GymBodyMetricsUseCase,
} from '../domain/ports/in/gym-body-metrics.usecase';
import { CreateBodyMetricDto } from './dtos/create-body-metric.dto';
import { UpdateBodyMetricDto } from './dtos/update-body-metric.dto';
import { BodyMetric } from '../domain/entities/body-metric.entity';
import { BodyMetricTrend } from '../domain/types';
import {
  BODY_MEASUREMENT_KEYS,
  BodyMeasurementKey,
  MAX_MEASUREMENT_CM,
} from '../domain/constants';
import {
  defaultWorkoutRange,
  parseWorkoutDate,
  resolveWorkoutRange,
} from '../domain/workout-date';
import {
  BODY_METRIC_REPOSITORY_PORT,
  BodyMetricRepository,
  ListBodyMetricsOptions,
} from '../domain/ports/out/body-metric.repository';

type BodyMetricPatch = Partial<{
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  height_cm: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
}>;

@Injectable()
export class GymBodyMetricsService implements GymBodyMetricsUseCase {
  constructor(
    @Inject(BODY_METRIC_REPOSITORY_PORT)
    private readonly repository: BodyMetricRepository,
  ) {}

  async upsert(user_id: string, dto: CreateBodyMetricDto): Promise<BodyMetric> {
    const date = parseWorkoutDate(dto.date);
    const patch = this.toPatch(dto);
    this.assertHasMetric(patch);

    const existing = await this.repository.findByDate(user_id, date);
    if (existing) {
      // A soft-deleted daily entry is revived by the new upsert.
      const base = existing.isDeleted() ? existing.restore() : existing;
      return this.repository.update(base.update(patch));
    }

    return this.repository.save(
      BodyMetric.create({
        user_id,
        date,
        weight_kg: patch.weight_kg ?? null,
        body_fat_pct: patch.body_fat_pct ?? null,
        muscle_mass_kg: patch.muscle_mass_kg ?? null,
        height_cm: patch.height_cm ?? null,
        measurements: patch.measurements ?? null,
        notes: patch.notes ?? null,
      }),
    );
  }

  async list(options: ListBodyMetricsOptions): Promise<BodyMetric[]> {
    return this.repository.findMany(options);
  }

  async latest(user_id: string): Promise<BodyMetric | null> {
    return this.repository.findLatest(user_id);
  }

  async trend(
    user_id: string,
    query: BodyMetricTrendQuery,
  ): Promise<BodyMetricTrend> {
    const range = resolveWorkoutRange(query) ?? defaultWorkoutRange();

    const data = await this.repository.findTrend({
      user_id,
      metric: query.metric,
      range,
    });

    return {
      metric: query.metric,
      range: { from: range.from, to: range.to },
      data,
    };
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<BodyMetric> {
    const metric = await this.repository.findById(user_id, id, include_deleted);
    if (!metric) {
      throw new NotFoundException('Body metric not found');
    }
    return metric;
  }

  async update(
    user_id: string,
    id: string,
    dto: UpdateBodyMetricDto,
  ): Promise<BodyMetric> {
    const metric = await this.getById(user_id, id);
    const patch = this.toPatch(dto);
    this.assertHasMetric(patch);

    return this.repository.update(metric.update(patch));
  }

  async softDelete(user_id: string, id: string): Promise<BodyMetric> {
    const metric = await this.getById(user_id, id);
    return this.repository.delete(metric.getId());
  }

  async restore(user_id: string, id: string): Promise<BodyMetric> {
    const metric = await this.getById(user_id, id, true);
    if (!metric.isDeleted()) {
      throw new ConflictException('This body metric is not deleted');
    }

    return this.repository.restore(metric.getId());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const metric = await this.getById(user_id, id, true);
    return this.repository.hardDelete(metric.getId());
  }

  private toPatch(dto: UpdateBodyMetricDto): BodyMetricPatch {
    const patch: BodyMetricPatch = {};

    if (dto.weight_kg !== undefined) patch.weight_kg = dto.weight_kg;
    if (dto.body_fat_pct !== undefined) patch.body_fat_pct = dto.body_fat_pct;
    if (dto.muscle_mass_kg !== undefined) {
      patch.muscle_mass_kg = dto.muscle_mass_kg;
    }
    if (dto.height_cm !== undefined) patch.height_cm = dto.height_cm;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.measurements !== undefined) {
      patch.measurements =
        dto.measurements === null
          ? null
          : this.validateMeasurements(dto.measurements);
    }

    return patch;
  }

  /** At least one measurement must be present: an empty entry is useless. */
  private assertHasMetric(patch: BodyMetricPatch): void {
    const hasValue =
      patch.weight_kg != null ||
      patch.body_fat_pct != null ||
      patch.muscle_mass_kg != null ||
      patch.measurements != null;

    if (!hasValue) {
      throw new BadRequestException(
        'Provide at least one of weight_kg, body_fat_pct, muscle_mass_kg or measurements',
      );
    }
  }

  private validateMeasurements(
    measurements: Record<string, number>,
  ): Record<string, number> {
    const keys = Object.keys(measurements);
    if (keys.length === 0) {
      throw new BadRequestException('measurements cannot be empty');
    }

    for (const key of keys) {
      if (!BODY_MEASUREMENT_KEYS.includes(key as BodyMeasurementKey)) {
        throw new BadRequestException(
          `measurements.${key} is not allowed. Use one of: ${BODY_MEASUREMENT_KEYS.join(', ')}`,
        );
      }

      const value = measurements[key];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > MAX_MEASUREMENT_CM
      ) {
        throw new BadRequestException(
          `measurements.${key} must be a number between 0 and ${MAX_MEASUREMENT_CM}`,
        );
      }
    }

    return measurements;
  }
}
