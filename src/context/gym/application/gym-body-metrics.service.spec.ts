import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GymBodyMetricsService } from './gym-body-metrics.service';
import {
  BODY_METRIC_REPOSITORY_PORT,
  BodyMetricRepository,
} from '../domain/ports/out/body-metric.repository';
import { BodyMetric } from '../domain/entities/body-metric.entity';

const base = {
  id: 'metric-1',
  user_id: 'user-1',
  date: new Date(Date.UTC(2026, 9, 15)),
  weight_kg: 80,
  body_fat_pct: 20,
  muscle_mass_kg: null,
  height_cm: null,
  measurements: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

describe('GymBodyMetricsService', () => {
  let service: GymBodyMetricsService;
  let repository: jest.Mocked<BodyMetricRepository>;

  beforeEach(async () => {
    repository = {
      save: jest.fn().mockImplementation(async (metric: BodyMetric) => metric),
      findByDate: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findLatest: jest.fn().mockResolvedValue(null),
      findTrend: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation(async (metric: BodyMetric) => metric),
      delete: jest
        .fn()
        .mockImplementation(async (metric: BodyMetric) => metric),
      restore: jest
        .fn()
        .mockImplementation(async (metric: BodyMetric) => metric),
      hardDelete: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymBodyMetricsService,
        { provide: BODY_METRIC_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<GymBodyMetricsService>(GymBodyMetricsService);
  });

  describe('upsert', () => {
    it('creates the entry of the day and computes the BMI', async () => {
      const metric = await service.upsert('user-1', {
        date: '2026-10-15',
        weight_kg: 80,
        height_cm: 180,
      });

      expect(metric.getUserId()).toBe('user-1');
      expect(metric.getBmi()).toBe(24.69);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates the entry when that date already exists', async () => {
      repository.findByDate.mockResolvedValue(BodyMetric.fromPrimitives(base));

      const metric = await service.upsert('user-1', {
        date: '2026-10-15',
        body_fat_pct: 19.5,
      });

      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(metric.getBodyFatPct()).toBe(19.5);
      // Fields not sent are kept.
      expect(metric.getWeightKg()).toBe(80);
    });

    it('revives a soft-deleted entry of that date', async () => {
      repository.findByDate.mockResolvedValue(
        BodyMetric.fromPrimitives({ ...base, deleted_at: new Date() }),
      );

      const metric = await service.upsert('user-1', {
        date: '2026-10-15',
        weight_kg: 81,
      });

      expect(metric.isDeleted()).toBe(false);
      expect(metric.getWeightKg()).toBe(81);
    });

    it('rejects an entry without any measurement', async () => {
      await expect(
        service.upsert('user-1', { date: '2026-10-15' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects unknown or invalid tape measurements', async () => {
      await expect(
        service.upsert('user-1', {
          date: '2026-10-15',
          measurements: { foot: 25 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.upsert('user-1', {
          date: '2026-10-15',
          measurements: { chest: -1 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('patches the requested fields', async () => {
      repository.findById.mockResolvedValue(BodyMetric.fromPrimitives(base));

      const metric = await service.update('user-1', 'metric-1', {
        body_fat_pct: 18,
      });

      expect(metric.getBodyFatPct()).toBe(18);
      expect(metric.getWeightKg()).toBe(80);
    });

    it('rejects an update without any measurement', async () => {
      repository.findById.mockResolvedValue(BodyMetric.fromPrimitives(base));

      await expect(
        service.update('user-1', 'metric-1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when the entry does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { weight_kg: 80 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('trend', () => {
    it('returns the points of the requested metric', async () => {
      repository.findTrend.mockResolvedValue([
        { date: new Date(Date.UTC(2026, 9, 1)), value: 80 },
        { date: new Date(Date.UTC(2026, 9, 8)), value: 79.2 },
      ]);

      const trend = await service.trend('user-1', {
        metric: 'weight_kg',
        from: '2026-10-01',
        to: '2026-10-15',
      });

      expect(trend.metric).toBe('weight_kg');
      expect(trend.range).not.toBeNull();
      expect(trend.data).toHaveLength(2);
      expect(repository.findTrend).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', metric: 'weight_kg' }),
      );
    });
  });

  it('only restores an entry that is actually deleted', async () => {
    repository.findById.mockResolvedValue(BodyMetric.fromPrimitives(base));

    await expect(service.restore('user-1', 'metric-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
