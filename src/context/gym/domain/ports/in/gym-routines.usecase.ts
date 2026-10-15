import { Routine } from '../../entities/routine.entity';
import { ListRoutinesOptions, RoutineWeek } from '../../types';
import { CreateRoutineDto } from '../../../application/dtos/create-routine.dto';
import { UpdateRoutineDto } from '../../../application/dtos/update-routine.dto';
import { SetRoutineDayDto } from '../../../application/dtos/set-routine-day.dto';

export const GYM_ROUTINES_USECASE = Symbol('GYM_ROUTINES_USECASE');

export interface GymRoutinesUseCase {
  create(user_id: string, dto: CreateRoutineDto): Promise<Routine>;
  list(options: ListRoutinesOptions): Promise<Routine[]>;
  /** The user's active routine (with its days), or `null`. */
  getActive(user_id: string): Promise<Routine | null>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Routine>;
  /** The routine plus its Monday-to-Sunday grid (always 7 slots). */
  getWeek(user_id: string, routine_id: string): Promise<RoutineWeek>;
  update(user_id: string, id: string, dto: UpdateRoutineDto): Promise<Routine>;
  /** Replaces the whole day (title, rest flag, notes and exercises). */
  setDay(
    user_id: string,
    routine_id: string,
    day_of_week: number,
    dto: SetRoutineDayDto,
  ): Promise<Routine>;
  deleteDay(
    user_id: string,
    routine_id: string,
    day_of_week: number,
  ): Promise<Routine>;
  activate(user_id: string, id: string): Promise<Routine>;
  deactivate(user_id: string, id: string): Promise<Routine>;
  softDelete(user_id: string, id: string): Promise<Routine>;
  restore(user_id: string, id: string): Promise<Routine>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
