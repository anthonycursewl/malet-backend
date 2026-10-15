import { GymVolumePeriod } from '../../constants';
import {
  GymCalendar,
  GymDateFilters,
  GymExerciseProgress,
  GymLoad,
  GymRecord,
  GymSummary,
  GymVolumeSeries,
  MuscleGroupVolume,
} from '../../types';

export const GYM_REPORTS_USECASE = Symbol('GYM_REPORTS_USECASE');

export interface GymRecordsQuery {
  muscle_group?: string;
  limit?: number;
}

export interface GymCalendarQuery {
  year: number;
  month: number;
  /** Plans against a concrete routine; defaults to the active one. */
  routine_id?: string;
}

export interface GymReportsUseCase {
  /** Volume, adherence and workload for the range (defaults to the last 30 days). */
  summary(user_id: string, filters: GymDateFilters): Promise<GymSummary>;
  /** Volume per day/week/month bucket. */
  volumeSeries(
    user_id: string,
    filters: GymDateFilters,
    period: GymVolumePeriod,
  ): Promise<GymVolumeSeries>;
  /** Volume (and sets/reps) per muscle group — used to spot imbalances. */
  muscleGroups(
    user_id: string,
    filters: GymDateFilters,
  ): Promise<MuscleGroupVolume>;
  /** Lifetime personal records (best weight, estimated 1RM and set volume). */
  records(user_id: string, query: GymRecordsQuery): Promise<GymRecord[]>;
  /** Month view: planned days (active routine) vs completed sessions. */
  calendar(user_id: string, query: GymCalendarQuery): Promise<GymCalendar>;
  /** Internal load: sRPE per bucket plus the current acute:chronic ratio. */
  load(
    user_id: string,
    filters: GymDateFilters,
    period: GymVolumePeriod,
  ): Promise<GymLoad>;
  /** Session-by-session progress of one exercise (% change over the range). */
  exerciseProgress(
    user_id: string,
    exercise_id: string,
    filters: GymDateFilters,
  ): Promise<GymExerciseProgress>;
}
