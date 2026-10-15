import { Exercise } from '../../entities/exercise.entity';
import { ListExercisesOptions } from '../../types';
import { CreateExerciseDto } from '../../../application/dtos/create-exercise.dto';
import { UpdateExerciseDto } from '../../../application/dtos/update-exercise.dto';

export const GYM_EXERCISES_USECASE = Symbol('GYM_EXERCISES_USECASE');

export interface GymExercisesUseCase {
  create(user_id: string, dto: CreateExerciseDto): Promise<Exercise>;
  list(options: ListExercisesOptions): Promise<Exercise[]>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Exercise>;
  update(
    user_id: string,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<Exercise>;
  softDelete(user_id: string, id: string): Promise<Exercise>;
  restore(user_id: string, id: string): Promise<Exercise>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
