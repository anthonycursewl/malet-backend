import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma.service';
import { TaskitiAnalyticsService } from './taskiti-analytics.service';

describe('TaskitiAnalyticsService', () => {
  let service: TaskitiAnalyticsService;
  let prisma: {
    user: { findMany: jest.Mock };
    taskiti_tasks: { findMany: jest.Mock; deleteMany: jest.Mock };
    taskiti_analytics: { upsert: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn() },
      taskiti_tasks: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      taskiti_analytics: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskitiAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TaskitiAnalyticsService>(TaskitiAnalyticsService);
  });

  describe('refreshNow', () => {
    it('should compute today and yesterday only for the given user', async () => {
      const computeDaySpy = jest
        .spyOn(service as any, 'computeDay')
        .mockResolvedValue(undefined);

      const result = await service.refreshNow('user-1');

      expect(computeDaySpy).toHaveBeenCalledTimes(2);
      const [firstUser, firstDate] = computeDaySpy.mock.calls[0];
      const [, secondDate] = computeDaySpy.mock.calls[1];
      expect(firstUser).toBe('user-1');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      expect([firstDate, secondDate].sort()).toEqual(
        [yesterdayStr, todayStr].sort(),
      );
      expect(result).toEqual({ ok: true });
    });

    it('should never run the global precomputeDaily (which scans all users)', async () => {
      const precomputeSpy = jest
        .spyOn(service as any, 'precomputeDaily')
        .mockResolvedValue(undefined);
      const computeDaySpy = jest
        .spyOn(service as any, 'computeDay')
        .mockResolvedValue(undefined);

      await service.refreshNow('user-1');

      expect(precomputeSpy).not.toHaveBeenCalled();
      expect(computeDaySpy).toHaveBeenCalledTimes(2);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});
