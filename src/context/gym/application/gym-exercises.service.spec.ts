import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GymExercisesService } from './gym-exercises.service';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';
import { Exercise } from '../domain/entities/exercise.entity';

describe('GymExercisesService', () => {
  let service: GymExercisesService;
  let repository: jest.Mocked<ExerciseRepository>;

  const globalExercise = Exercise.fromPrimitives({
    id: 'ex-global',
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
    repository = {
      save: jest
        .fn()
        .mockImplementation(async (exercise: Exercise) => exercise),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findByIds: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation(async (exercise: Exercise) => exercise),
      delete: jest
        .fn()
        .mockImplementation(async (exercise: Exercise) => exercise),
      restore: jest
        .fn()
        .mockImplementation(async (exercise: Exercise) => exercise),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      isUsedInRoutines: jest.fn().mockResolvedValue(false),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymExercisesService,
        { provide: EXERCISE_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<GymExercisesService>(GymExercisesService);
  });

  it('creates a personal exercise with the strength type by default', async () => {
    const exercise = await service.create('user-1', {
      name: 'Mi press',
      muscle_group: 'chest',
    });

    expect(exercise.getUserId()).toBe('user-1');
    expect(exercise.getType()).toBe('strength');
    expect(exercise.isGlobal()).toBe(false);
  });

  it('throws NotFoundException when the exercise does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to modify the shared base catalog', async () => {
    repository.findById.mockResolvedValue(globalExercise);

    await expect(
      service.update('user-1', globalExercise.getId(), { name: 'Otro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.softDelete('user-1', globalExercise.getId()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('blocks the hard delete of an exercise used by a routine', async () => {
    const owned = Exercise.create({
      user_id: 'user-1',
      name: 'Curl',
      muscle_group: 'biceps',
    });
    repository.findById.mockResolvedValue(owned);
    repository.isUsedInRoutines.mockResolvedValue(true);

    await expect(
      service.hardDelete('user-1', owned.getId()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('only restores an exercise that is actually deleted', async () => {
    const owned = Exercise.create({
      user_id: 'user-1',
      name: 'Curl',
      muscle_group: 'biceps',
    });
    repository.findById.mockResolvedValue(owned);

    await expect(
      service.restore('user-1', owned.getId()),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
