import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GymRoutinesService } from './gym-routines.service';
import {
  ROUTINE_REPOSITORY_PORT,
  RoutineRepository,
} from '../domain/ports/out/routine.repository';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';
import { Routine } from '../domain/entities/routine.entity';
import { Exercise } from '../domain/entities/exercise.entity';

const buildRoutine = (is_active = false): Routine =>
  Routine.fromPrimitives({
    id: 'routine-1',
    user_id: 'user-1',
    name: 'Full body',
    description: null,
    is_active,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    days: [
      {
        id: 'day-1',
        routine_id: 'routine-1',
        day_of_week: 1,
        title: 'Pecho',
        is_rest: false,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        exercises: [
          {
            id: 're-1',
            routine_day_id: 'day-1',
            exercise_id: 'ex-1',
            position: 1,
            sets: 3,
            reps_min: null,
            reps_max: 8,
            target_weight: 60,
            rest_seconds: 90,
            superset_group: null,
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      },
    ],
  });

describe('GymRoutinesService', () => {
  let service: GymRoutinesService;
  let routineRepository: jest.Mocked<RoutineRepository>;
  let exerciseRepository: jest.Mocked<ExerciseRepository>;

  const exercise = Exercise.create({
    user_id: 'user-1',
    name: 'Press de banca',
    muscle_group: 'chest',
  });

  beforeEach(async () => {
    routineRepository = {
      save: jest.fn().mockImplementation(async (routine: Routine) => routine),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue(null),
      findDayById: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(async (routine: Routine) => routine),
      saveDay: jest.fn().mockResolvedValue(undefined),
      deleteDay: jest.fn().mockResolvedValue(undefined),
      setActive: jest.fn().mockResolvedValue(undefined),
      deactivate: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockImplementation(async (routine: Routine) => routine),
      restore: jest
        .fn()
        .mockImplementation(async (routine: Routine) => routine),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      hasSessions: jest.fn().mockResolvedValue(false),
    } as any;

    exerciseRepository = {
      findByIds: jest.fn().mockResolvedValue([exercise]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymRoutinesService,
        { provide: ROUTINE_REPOSITORY_PORT, useValue: routineRepository },
        { provide: EXERCISE_REPOSITORY_PORT, useValue: exerciseRepository },
      ],
    }).compile();

    service = module.get<GymRoutinesService>(GymRoutinesService);
  });

  describe('create', () => {
    it('activates the first routine of the user automatically', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine(true));

      await service.create('user-1', { name: 'Full body' });

      const saved = routineRepository.save.mock.calls[0][0];
      expect(routineRepository.setActive).toHaveBeenCalledWith(
        'user-1',
        saved.getId(),
      );
    });

    it('does not touch the active routine when one already exists', async () => {
      routineRepository.findActive.mockResolvedValue(buildRoutine(true));

      await service.create('user-1', { name: 'Otra rutina' });

      expect(routineRepository.setActive).not.toHaveBeenCalled();
    });
  });

  describe('getWeek', () => {
    it('returns the seven days with the missing ones empty', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine(true));

      const week = await service.getWeek('user-1', 'routine-1');

      expect(week.days).toHaveLength(7);
      expect(week.days[0]).toMatchObject({
        day_of_week: 1,
        id: 'day-1',
        title: 'Pecho',
      });
      expect(week.days[0].exercises).toHaveLength(1);
      expect(week.days[6]).toMatchObject({ day_of_week: 7, id: null });
      expect(week.routine.is_active).toBe(true);
    });
  });

  describe('setDay', () => {
    it('rejects a rest day carrying exercises', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine());

      await expect(
        service.setDay('user-1', 'routine-1', 2, {
          is_rest: true,
          exercises: [{ exercise_id: exercise.getId() }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(routineRepository.saveDay).not.toHaveBeenCalled();
    });

    it('rejects unknown exercises', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine());
      exerciseRepository.findByIds.mockResolvedValue([]);

      await expect(
        service.setDay('user-1', 'routine-1', 2, {
          exercises: [{ exercise_id: 'missing' }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('saves the whole day and returns the updated routine', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine());

      const routine = await service.setDay('user-1', 'routine-1', 2, {
        title: 'Pierna',
        exercises: [{ exercise_id: exercise.getId(), sets: 4, reps_max: 10 }],
      });

      expect(routineRepository.saveDay).toHaveBeenCalledTimes(1);
      const day = routineRepository.saveDay.mock.calls[0][0];
      expect(day.getDayOfWeek()).toBe(2);
      expect(day.getExercises()[0].getSets()).toBe(4);
      expect(routine.getId()).toBe('routine-1');
    });

    it('rejects a rep range where the minimum is above the maximum', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine());

      await expect(
        service.setDay('user-1', 'routine-1', 2, {
          exercises: [
            { exercise_id: exercise.getId(), reps_min: 12, reps_max: 8 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(routineRepository.saveDay).not.toHaveBeenCalled();
    });

    it('rejects an out of range day', async () => {
      await expect(
        service.setDay('user-1', 'routine-1', 9, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('delete guards', () => {
    it('refuses to delete the active routine', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine(true));

      await expect(
        service.softDelete('user-1', 'routine-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(routineRepository.delete).not.toHaveBeenCalled();
    });

    it('blocks the hard delete when the routine has sessions', async () => {
      routineRepository.findById.mockResolvedValue(buildRoutine(false));
      routineRepository.hasSessions.mockResolvedValue(true);

      await expect(
        service.hardDelete('user-1', 'routine-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(routineRepository.hardDelete).not.toHaveBeenCalled();
    });
  });

  it('returns the active routine of the user', async () => {
    routineRepository.findActive.mockResolvedValue(buildRoutine(true));

    const routine = await service.getActive('user-1');

    expect(routine?.getId()).toBe('routine-1');
    expect(routineRepository.findActive).toHaveBeenCalledWith('user-1');
  });

  it('activate switches the active routine of the user', async () => {
    routineRepository.findById.mockResolvedValue(buildRoutine(false));

    await service.activate('user-1', 'routine-1');

    expect(routineRepository.setActive).toHaveBeenCalledWith(
      'user-1',
      'routine-1',
    );
  });
});
