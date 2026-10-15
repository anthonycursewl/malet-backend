import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GymReportsService } from './gym-reports.service';
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
import { Routine } from '../domain/entities/routine.entity';
import { Exercise } from '../domain/entities/exercise.entity';

const routineDay = (day_of_week: number, is_rest: boolean, title?: string) => ({
  id: `day-${day_of_week}`,
  routine_id: 'routine-1',
  day_of_week,
  title: title ?? null,
  is_rest,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  exercises: [],
});

describe('GymReportsService', () => {
  let service: GymReportsService;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let routineRepository: jest.Mocked<RoutineRepository>;
  let exerciseRepository: jest.Mocked<ExerciseRepository>;

  const activeRoutine = Routine.fromPrimitives({
    id: 'routine-1',
    user_id: 'user-1',
    name: 'Full body',
    description: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    days: [
      routineDay(1, false, 'Pecho'),
      routineDay(2, true),
      routineDay(3, false),
      routineDay(5, false),
      routineDay(7, true),
    ],
  });

  const exercise = Exercise.fromPrimitives({
    id: 'ex-1',
    user_id: null,
    name: 'Press de banca',
    muscle_group: 'chest',
    equipment: 'barbell',
    type: 'strength',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  });

  beforeEach(async () => {
    sessionRepository = {
      getSummaryNumbers: jest.fn(),
      getVolumeSeries: jest.fn().mockResolvedValue([]),
      getMuscleGroupVolume: jest.fn().mockResolvedValue([]),
      getRecords: jest.fn().mockResolvedValue([]),
      getDailyLoad: jest.fn().mockResolvedValue([]),
      getDailyVolume: jest.fn().mockResolvedValue([]),
      getExerciseProgress: jest.fn().mockResolvedValue([]),
    } as any;

    routineRepository = {
      findActive: jest.fn().mockResolvedValue(activeRoutine),
      findById: jest.fn().mockResolvedValue(activeRoutine),
    } as any;

    exerciseRepository = {
      findById: jest.fn().mockResolvedValue(exercise),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymReportsService,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: ROUTINE_REPOSITORY_PORT, useValue: routineRepository },
        { provide: EXERCISE_REPOSITORY_PORT, useValue: exerciseRepository },
      ],
    }).compile();

    service = module.get<GymReportsService>(GymReportsService);
  });

  it('summarizes volume and computes adherence from the active routine', async () => {
    sessionRepository.getSummaryNumbers.mockResolvedValue({
      sessions_count: 8,
      training_days: 6,
      total_sets: 40,
      total_reps: 300,
      total_volume: 12000,
      total_duration_minutes: 400,
      average_rpe: 7.5,
    });

    const summary = await service.summary('user-1', {});

    expect(summary.sessions_count).toBe(8);
    expect(summary.total_volume).toBe(12000);
    expect(summary.planned_sessions).toBe(13);
    expect(summary.adherence).toBe(0.62);
    expect(summary.range).not.toBeNull();
  });

  it('leaves adherence empty when there is no active routine', async () => {
    routineRepository.findActive.mockResolvedValue(null);
    sessionRepository.getSummaryNumbers.mockResolvedValue({
      sessions_count: 0,
      training_days: 0,
      total_sets: 0,
      total_reps: 0,
      total_volume: 0,
      total_duration_minutes: 0,
      average_rpe: null,
    });

    const summary = await service.summary('user-1', {});

    expect(summary.planned_sessions).toBeNull();
    expect(summary.adherence).toBeNull();
  });

  it('passes the period and range down to the volume series', async () => {
    sessionRepository.getVolumeSeries.mockResolvedValue([
      {
        bucket: '2026-10-01T00:00:00.000Z',
        sessions: 1,
        sets: 10,
        reps: 80,
        volume: 2000,
      },
    ]);

    const series = await service.volumeSeries(
      'user-1',
      { preset: 'last_7_days' },
      'week',
    );

    expect(series.period).toBe('week');
    expect(series.data).toHaveLength(1);
    expect(sessionRepository.getVolumeSeries).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', period: 'week' }),
    );
  });

  it('groups the volume by muscle group', async () => {
    sessionRepository.getMuscleGroupVolume.mockResolvedValue([
      { muscle_group: 'chest', volume: 2400, sets: 12, reps: 96, sessions: 3 },
    ]);

    const result = await service.muscleGroups('user-1', {});

    expect(result.data[0].muscle_group).toBe('chest');
    expect(result.range).not.toBeNull();
    expect(sessionRepository.getMuscleGroupVolume).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' }),
    );
  });

  it('forwards the records filters', async () => {
    await service.records('user-1', { muscle_group: 'chest', limit: 5 });

    expect(sessionRepository.getRecords).toHaveBeenCalledWith({
      user_id: 'user-1',
      muscle_group: 'chest',
      limit: 5,
    });
  });

  it('builds the monthly calendar with planned vs completed days', async () => {
    // 2026-10-05 is a Monday (planned in the active routine).
    sessionRepository.getDailyVolume.mockResolvedValue([
      {
        date: '2026-10-05',
        sessions: 1,
        volume: 400,
        session_id: 'session-1',
      },
    ]);

    const calendar = await service.calendar('user-1', {
      year: 2026,
      month: 10,
    });

    expect(calendar.data).toHaveLength(31);
    // 3 planned weekdays (Mon/Wed/Fri) over October 2026 => 4 + 4 + 5 = 13 days.
    expect(calendar.summary.planned_days).toBe(13);
    expect(calendar.summary.completed_days).toBe(1);
    expect(calendar.summary.adherence).toBe(0.08);
    expect(calendar.summary.total_volume).toBe(400);

    const monday = calendar.data.find((day) => day.date === '2026-10-05');
    expect(monday).toMatchObject({
      day_of_week: 1,
      planned: true,
      planned_title: 'Pecho',
      completed: true,
      volume: 400,
    });
    expect(monday?.session_id).not.toBeNull();
    expect(calendar.routine_name).toBe('Full body');
  });

  it('computes the internal load and the acute:chronic ratio', async () => {
    sessionRepository.getDailyLoad.mockResolvedValue([
      { date: '2026-09-20', sessions: 1, duration_minutes: 60, srpe: 300 },
      { date: '2026-10-15', sessions: 1, duration_minutes: 60, srpe: 480 },
    ]);

    const load = await service.load(
      'user-1',
      { from: '2026-10-15', to: '2026-10-15' },
      'week',
    );

    expect(load.acute_7d).toBe(480);
    expect(load.chronic_28d_weekly_avg).toBe(195); // (480 + 300) / 4
    expect(load.acwr).toBe(2.46);
    expect(load.total_srpe).toBe(480);
    expect(load.daily).toHaveLength(1);
    expect(load.data).toEqual([
      {
        bucket: '2026-10-12',
        sessions: 1,
        duration_minutes: 60,
        srpe: 480,
      },
    ]);
  });

  it('reports the progression of one exercise', async () => {
    sessionRepository.getExerciseProgress.mockResolvedValue([
      {
        date: '2026-09-01',
        max_weight: 70,
        estimated_1rm: 80,
        volume: 1000,
        sets: 8,
        reps: 80,
      },
      {
        date: '2026-10-01',
        max_weight: 80,
        estimated_1rm: 93.33,
        volume: 1200,
        sets: 8,
        reps: 80,
      },
    ]);

    const progress = await service.exerciseProgress('user-1', 'ex-1', {});

    expect(progress.exercise_name).toBe('Press de banca');
    expect(progress.muscle_group).toBe('chest');
    expect(progress.data).toHaveLength(2);
    expect(progress.progression.volume_change_pct).toBe(20);
    expect(progress.progression.estimated_1rm_change_pct).toBe(16.66);
  });

  it('throws NotFoundException for an unknown exercise', async () => {
    exerciseRepository.findById.mockResolvedValue(null);

    await expect(
      service.exerciseProgress('user-1', 'missing', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
