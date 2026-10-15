import { WorkoutSession } from '../../entities/workout-session.entity';
import { GymSessionFilters } from '../../types';
import { CreateSessionDto } from '../../../application/dtos/create-session.dto';
import { UpdateSessionDto } from '../../../application/dtos/update-session.dto';

export const GYM_SESSIONS_USECASE = Symbol('GYM_SESSIONS_USECASE');

export interface GymSessionsUseCase {
  create(user_id: string, dto: CreateSessionDto): Promise<WorkoutSession>;
  list(options: GymSessionFilters): Promise<WorkoutSession[]>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<WorkoutSession>;
  update(
    user_id: string,
    id: string,
    dto: UpdateSessionDto,
  ): Promise<WorkoutSession>;
  softDelete(user_id: string, id: string): Promise<WorkoutSession>;
  restore(user_id: string, id: string): Promise<WorkoutSession>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
