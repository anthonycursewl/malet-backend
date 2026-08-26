import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { TaskitiTasksService } from './taskiti-tasks.service';

describe('TaskitiTasksService', () => {
  let service: TaskitiTasksService;
  let prisma: {
    taskiti_tasks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const existingTask = {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Original title',
    description: '',
    completed: false,
    completed_at: null,
    priority: 'medium',
    tags: [],
    notes: '',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    expires_at: new Date('2026-01-02T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    deleted_at: null,
    version: 2,
  };

  beforeEach(async () => {
    prisma = {
      taskiti_tasks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (ops: any[]) => {
        for (const op of ops) {
          if (op && typeof op.then === 'function') await op;
        }
        return [];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskitiTasksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TaskitiTasksService>(TaskitiTasksService);
  });

  describe('update', () => {
    it('should throw ConflictException (version_conflict) when version does not match', async () => {
      prisma.taskiti_tasks.findUnique.mockResolvedValue(existingTask);

      await expect(
        service.update('user-1', 'task-1', {
          title: 'Stale edit',
          version: 1,
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          error: 'version_conflict',
          task_id: 'task-1',
          client_version: 1,
          server_version: 2,
        },
      });

      expect(prisma.taskiti_tasks.update).not.toHaveBeenCalled();
    });

    it('should update the task and bump version when version matches', async () => {
      prisma.taskiti_tasks.findUnique.mockResolvedValue(existingTask);
      prisma.taskiti_tasks.update.mockResolvedValue({
        ...existingTask,
        title: 'New title',
        version: 3,
      });

      const result = await service.update('user-1', 'task-1', {
        title: 'New title',
        version: 2,
      });

      expect(prisma.taskiti_tasks.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({ title: 'New title', version: 3 }),
      });
      expect(result.task.title).toBe('New title');
      expect(result.task.version).toBe(3);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.taskiti_tasks.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { version: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task belongs to another user', async () => {
      prisma.taskiti_tasks.findUnique.mockResolvedValue({
        ...existingTask,
        user_id: 'user-other',
      });

      await expect(
        service.update('user-1', 'task-1', { version: 2 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sync', () => {
    it('should mark tasks from completed_ids as completed', async () => {
      prisma.taskiti_tasks.findMany.mockResolvedValue([existingTask]);
      prisma.taskiti_tasks.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...existingTask, ...data }),
      );

      const result = await service.sync('user-1', {
        tasks: [],
        completed_ids: ['task-1'],
        last_sync_at: new Date(0).toISOString(),
      });

      expect(prisma.taskiti_tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({
            completed: true,
            version: 3,
          }),
        }),
      );
      expect(result.conflicts).toEqual([]);
    });

    it('should ignore completed_ids for tasks already completed', async () => {
      prisma.taskiti_tasks.findMany.mockResolvedValue([
        { ...existingTask, completed: true, completed_at: new Date() },
      ]);

      const result = await service.sync('user-1', {
        tasks: [],
        completed_ids: ['task-1'],
        last_sync_at: new Date(0).toISOString(),
      });

      expect(prisma.taskiti_tasks.update).not.toHaveBeenCalled();
      expect(result.conflicts).toEqual([]);
    });

    it('should ignore completed_ids for tasks that do not exist', async () => {
      prisma.taskiti_tasks.findMany.mockResolvedValue([]);

      await service.sync('user-1', {
        tasks: [],
        completed_ids: ['ghost-task'],
        last_sync_at: new Date(0).toISOString(),
      });

      expect(prisma.taskiti_tasks.update).not.toHaveBeenCalled();
    });

    it('should not overwrite a task that arrives both in tasks[] and completed_ids', async () => {
      prisma.taskiti_tasks.findMany.mockResolvedValue([existingTask]);
      prisma.taskiti_tasks.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...existingTask, ...data }),
      );

      const result = await service.sync('user-1', {
        tasks: [
          {
            ...existingTask,
            id: 'task-1',
            title: 'From payload',
            completed: false,
          },
        ],
        completed_ids: ['task-1'],
        last_sync_at: new Date(0).toISOString(),
      });

      expect(prisma.taskiti_tasks.update).toHaveBeenCalledTimes(1);
      const call = prisma.taskiti_tasks.update.mock.calls[0][0];
      expect(call.data.completed).toBe(false);
      expect(result.conflicts).toEqual([]);
    });
  });
});
