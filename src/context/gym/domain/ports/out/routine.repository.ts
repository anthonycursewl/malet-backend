import { Routine } from '../../entities/routine.entity';
import { RoutineDay } from '../../entities/routine-day.entity';
import { ListRoutinesOptions } from '../../types';

export const ROUTINE_REPOSITORY_PORT = Symbol('ROUTINE_REPOSITORY_PORT');

export interface RoutineRepository {
  /** Creates the routine (days are added later through `saveDay`). */
  save(routine: Routine): Promise<Routine>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Routine | null>;
  findMany(options: ListRoutinesOptions): Promise<Routine[]>;
  findActive(user_id: string): Promise<Routine | null>;
  /** A single day (with its exercises) validated against the routine owner. */
  findDayById(user_id: string, day_id: string): Promise<RoutineDay | null>;
  /** Updates the routine columns only (never touches the days). */
  update(routine: Routine): Promise<Routine>;
  /** Upserts the day by `(routine_id, day_of_week)` and replaces its exercises. */
  saveDay(day: RoutineDay): Promise<void>;
  deleteDay(routine_id: string, day_of_week: number): Promise<void>;
  /** Activates one routine and deactivates the rest of the user's routines. */
  setActive(user_id: string, routine_id: string): Promise<void>;
  deactivate(routine_id: string): Promise<void>;
  delete(id: string): Promise<Routine>;
  restore(id: string): Promise<Routine>;
  hardDelete(id: string): Promise<void>;
  hasSessions(routine_id: string): Promise<boolean>;
}
