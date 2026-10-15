import { Exercise } from '../../entities/exercise.entity';
import { ListExercisesOptions } from '../../types';

export const EXERCISE_REPOSITORY_PORT = Symbol('EXERCISE_REPOSITORY_PORT');

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<Exercise>;
  /** Resolves a catalog (global) or personal exercise. */
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Exercise | null>;
  findMany(options: ListExercisesOptions): Promise<Exercise[]>;
  /** Batch resolution used to validate the exercises sent in a routine/session. */
  findByIds(user_id: string, ids: string[]): Promise<Exercise[]>;
  update(exercise: Exercise): Promise<Exercise>;
  delete(id: string): Promise<Exercise>;
  restore(id: string): Promise<Exercise>;
  hardDelete(id: string): Promise<void>;
  /** `true` when a routine references the exercise (blocks hard delete). */
  isUsedInRoutines(id: string): Promise<boolean>;
}
