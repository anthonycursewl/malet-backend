import { WorkoutSession } from '../../entities/workout-session.entity';
import {
  GymDailyVolume,
  GymExerciseProgressPoint,
  GymLoadDay,
  GymRecord,
  GymSummaryNumbers,
  GymVolumeSeriesPoint,
  MuscleGroupVolumePoint,
  WorkoutRange,
} from '../../types';

export const SESSION_REPOSITORY_PORT = Symbol('SESSION_REPOSITORY_PORT');

export interface FindSessionsOptions {
  user_id: string;
  take: number;
  cursor?: string;
  routine_id?: string;
  routine_day_id?: string;
  status?: string;
  range?: WorkoutRange;
}

export interface SessionSummaryOptions {
  user_id: string;
  range?: WorkoutRange;
}

export interface SessionVolumeSeriesOptions {
  user_id: string;
  period: string;
  range?: WorkoutRange;
}

export interface SessionRecordsOptions {
  user_id: string;
  muscle_group?: string;
  limit?: number;
}

export interface SessionRangeOptions {
  user_id: string;
  range?: WorkoutRange;
}

export interface SessionExerciseProgressOptions extends SessionRangeOptions {
  exercise_id: string;
}

export interface SessionRepository {
  save(session: WorkoutSession): Promise<WorkoutSession>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<WorkoutSession | null>;
  findMany(options: FindSessionsOptions): Promise<WorkoutSession[]>;
  /** Updates the session columns and replaces its exercises/sets. */
  update(session: WorkoutSession): Promise<WorkoutSession>;
  delete(id: string): Promise<WorkoutSession>;
  restore(id: string): Promise<WorkoutSession>;
  hardDelete(id: string): Promise<void>;
  getSummaryNumbers(options: SessionSummaryOptions): Promise<GymSummaryNumbers>;
  getVolumeSeries(
    options: SessionVolumeSeriesOptions,
  ): Promise<GymVolumeSeriesPoint[]>;
  /** Volume/sets/reps grouped by the muscle-group snapshot of each exercise. */
  getMuscleGroupVolume(
    options: SessionRangeOptions,
  ): Promise<MuscleGroupVolumePoint[]>;
  getRecords(options: SessionRecordsOptions): Promise<GymRecord[]>;
  /** Per-day sRPE (`rpe × duration_minutes`) used for the training load. */
  getDailyLoad(options: SessionRangeOptions): Promise<GymLoadDay[]>;
  /** Per-day aggregated volume, used by the monthly calendar. */
  getDailyVolume(options: SessionRangeOptions): Promise<GymDailyVolume[]>;
  /** Per-session best weight / estimated 1RM / volume of one exercise. */
  getExerciseProgress(
    options: SessionExerciseProgressOptions,
  ): Promise<GymExerciseProgressPoint[]>;
}
