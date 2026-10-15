import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GymExercisesUseCase } from '../domain/ports/in/gym-exercises.usecase';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { UpdateExerciseDto } from './dtos/update-exercise.dto';
import { Exercise } from '../domain/entities/exercise.entity';
import { ListExercisesOptions } from '../domain/types';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';

@Injectable()
export class GymExercisesService implements GymExercisesUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY_PORT)
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  async create(user_id: string, dto: CreateExerciseDto): Promise<Exercise> {
    const exercise = Exercise.create({
      user_id,
      name: dto.name,
      muscle_group: dto.muscle_group,
      equipment: dto.equipment,
      type: dto.type,
    });

    return this.exerciseRepository.save(exercise);
  }

  async list(options: ListExercisesOptions): Promise<Exercise[]> {
    return this.exerciseRepository.findMany(options);
  }

  async getById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findById(
      user_id,
      id,
      include_deleted,
    );
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }
    return exercise;
  }

  async update(
    user_id: string,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    const exercise = await this.getOwned(user_id, id);

    const patch: Parameters<Exercise['update']>[0] = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.muscle_group !== undefined) patch.muscle_group = dto.muscle_group;
    if (dto.equipment !== undefined) patch.equipment = dto.equipment;
    if (dto.type !== undefined) patch.type = dto.type;

    return this.exerciseRepository.update(exercise.update(patch));
  }

  async softDelete(user_id: string, id: string): Promise<Exercise> {
    const exercise = await this.getOwned(user_id, id);
    return this.exerciseRepository.delete(exercise.getId());
  }

  async restore(user_id: string, id: string): Promise<Exercise> {
    const exercise = await this.getOwned(user_id, id, true);
    if (!exercise.isDeleted()) {
      throw new ConflictException('This exercise is not deleted');
    }

    return this.exerciseRepository.restore(exercise.getId());
  }

  async hardDelete(user_id: string, id: string): Promise<void> {
    const exercise = await this.getOwned(user_id, id, true);

    if (await this.exerciseRepository.isUsedInRoutines(exercise.getId())) {
      throw new ConflictException(
        'This exercise is used by a routine: remove it from the routine first',
      );
    }

    return this.exerciseRepository.hardDelete(exercise.getId());
  }

  /** Personal exercises only: the shared base catalog cannot be modified. */
  private async getOwned(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Exercise> {
    const exercise = await this.getById(user_id, id, include_deleted);

    if (exercise.isGlobal()) {
      throw new ForbiddenException(
        'The base exercise catalog cannot be modified',
      );
    }
    if (exercise.getUserId() !== user_id) {
      throw new ForbiddenException('You do not own this exercise');
    }

    return exercise;
  }
}
