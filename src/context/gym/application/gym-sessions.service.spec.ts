import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GymSessionsService } from './gym-sessions.service';
import {
  SESSION_REPOSITORY_PORT,
  SessionRepository,
} from '../domain/ports/out/session.repository';
import {
  ROUTINE_REPOSITORY_PORT,
  RoutineRepository,
} from '../domain/ports/out/routine.repository';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';
import { WorkoutSession } from '../domain/entities/workout-session.entity';
import { RoutineDay } from '../domain/entities/routine-day.entity';
import { Routine } from '../domain/entities/routine.entity';
import { Exercise } from '../domain/entities/exercise.entity';

describe('GymSessionsService', () => {
  let service: GymSessionsService;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let routineRepository: jest.Mocked<RoutineRepository>;
  let exerciseRepository: jest.Mocked<ExerciseRepository>;

  const exercise = Exercise.create({
    user_id: 'user-1',
    name: 'Press de banca',
    muscle_group: 'chest',
  });

  const buildDay = (): RoutineDay =>
    RoutineDay.fromPrimitives({
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
          exercise_id: exercise.getId(),
          position: 1,
          sets: 3,
          reps_min: null,
          reps_max: 10,
          target_weight: 50,
          rest_seconds: 60,
          superset_group: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });

  beforeEach(async () => {
    sessionRepository = {
      save: jest
        .fn()
        .mockImplementation(async (session: WorkoutSession) => session),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation(async (session: WorkoutSession) => session),
      delete: jest
        .fn()
        .mockImplementation(async (session: WorkoutSession) => session),
      restore: jest
        .fn()
        .mockImplementation(async (session: WorkoutSession) => session),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      getSummaryNumbers: jest.fn(),
      getVolumeSeries: jest.fn(),
      getRecords: jest.fn(),
    } as any;

    routineRepository = {
      findById: jest
        .fn()
        .mockResolvedValue(
          Routine.create({ user_id: 'user-1', name: 'Full body' }),
        ),
      findDayById: jest.fn().mockResolvedValue(null),
    } as any;

    exerciseRepository = {
      findByIds: jest.fn().mockResolvedValue([exercise]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymSessionsService,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: ROUTINE_REPOSITORY_PORT, useValue: routineRepository },
        { provide: EXERCISE_REPOSITORY_PORT, useValue: exerciseRepository },
      ],
    }).compile();

    service = module.get<GymSessionsService>(GymSessionsService);
  });

  it('snapshots the catalog exercise and its sets', async () => {
    const session = await service.create('user-1', {
      exercises: [
        {
          exercise_id: exercise.getId(),
          sets: [
            { reps: 10, weight: 40 },
            { reps: 8, weight: 45 },
          ],
        },
      ],
    });

    expect(session.getStatus()).toBe('completed');
    const logged = session.getExercises()[0];
    expect(logged.getExerciseName()).toBe('Press de banca');
    expect(logged.getMuscleGroup()).toBe('chest');
    expect(logged.getSets()).toHaveLength(2);
    expect(logged.getSets()[0].getSetNumber()).toBe(1);
    expect(logged.getSets()[1].getWeight()).toBe(45);
  });

  it('accepts a free-text exercise without catalog id', async () => {
    const session = await service.create('user-1', {
      exercises: [
        {
          exercise_name: 'Mi ejercicio',
          muscle_group: 'core',
          sets: [{ reps: 20 }],
        },
      ],
    });

    const logged = session.getExercises()[0];
    expect(logged.getExerciseId()).toBeNull();
    expect(logged.getExerciseName()).toBe('Mi ejercicio');
    expect(logged.getMuscleGroup()).toBe('core');
  });

  it('rejects an exercise without id or name', async () => {
    await expect(
      service.create('user-1', { exercises: [{ sets: [] }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a set without reps or duration', async () => {
    await expect(
      service.create('user-1', {
        exercises: [{ exercise_id: exercise.getId(), sets: [{ weight: 40 }] }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown catalog exercise', async () => {
    exerciseRepository.findByIds.mockResolvedValue([]);

    await expect(
      service.create('user-1', {
        exercises: [{ exercise_id: 'missing', sets: [] }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prefills an in-progress session from a routine day', async () => {
    routineRepository.findDayById.mockResolvedValue(buildDay());

    const session = await service.create('user-1', { routine_day_id: 'day-1' });

    expect(session.getStatus()).toBe('in_progress');
    expect(session.getRoutineId()).toBe('routine-1');
    expect(session.getRoutineDayId()).toBe('day-1');
    const logged = session.getExercises()[0];
    expect(logged.getSets()).toHaveLength(3);
    expect(logged.getSets()[0].getReps()).toBe(10);
    expect(logged.getSets()[0].getWeight()).toBe(50);
    expect(logged.getSets()[0].isCompleted()).toBe(false);
  });

  it('replaces the exercises and patches the session on update', async () => {
    const existing = WorkoutSession.create({
      user_id: 'user-1',
      routine_id: null,
      routine_day_id: null,
      date: new Date('2026-10-15'),
      status: 'completed',
      started_at: null,
      finished_at: null,
      duration_minutes: null,
      rpe: null,
      notes: null,
      exercises: [],
    });
    sessionRepository.findById.mockResolvedValue(existing);

    const updated = await service.update('user-1', existing.getId(), {
      rpe: 9,
      exercises: [
        { exercise_id: exercise.getId(), sets: [{ reps: 5, weight: 100 }] },
      ],
    });

    expect(updated.getRpe()).toBe(9);
    expect(updated.getExercises()).toHaveLength(1);
    expect(updated.getExercises()[0].getSets()[0].getWeight()).toBe(100);
  });

  it('links the routine when a routine day is assigned on update', async () => {
    const existing = WorkoutSession.create({
      user_id: 'user-1',
      routine_id: null,
      routine_day_id: null,
      date: new Date('2026-10-15'),
      status: 'completed',
      started_at: null,
      finished_at: null,
      duration_minutes: null,
      rpe: null,
      notes: null,
      exercises: [],
    });
    sessionRepository.findById.mockResolvedValue(existing);
    routineRepository.findDayById.mockResolvedValue(buildDay());

    const updated = await service.update('user-1', existing.getId(), {
      routine_day_id: 'day-1',
    });

    expect(updated.getRoutineId()).toBe('routine-1');
    expect(updated.getRoutineDayId()).toBe('day-1');
  });
});
