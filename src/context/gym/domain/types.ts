import { GymSessionStatus, GymVolumePeriod } from './constants';
import { WorkoutRange } from './workout-date';
import { RoutinePrimitives } from './entities/routine.entity';
import { RoutineExercisePrimitives } from './entities/routine-exercise.entity';

/** Filters shared by session listings and reports. */
export interface GymDateFilters {
  preset?: string;
  from?: string;
  to?: string;
}

/** Application-facing filters for the session listing. */
export interface GymSessionFilters extends GymDateFilters {
  user_id: string;
  take: number;
  cursor?: string;
  routine_id?: string;
  routine_day_id?: string;
  status?: GymSessionStatus;
}

export interface ListExercisesOptions {
  user_id: string;
  take: number;
  cursor?: string;
  /** Case-insensitive name search. */
  search?: string;
  muscle_group?: string;
  type?: string;
}

export interface ListRoutinesOptions {
  user_id: string;
  take: number;
  cursor?: string;
}

export interface GymSummaryNumbers {
  sessions_count: number;
  training_days: number;
  total_sets: number;
  total_reps: number;
  total_volume: number;
  total_duration_minutes: number;
  average_rpe: number | null;
}

export interface GymSummary extends GymSummaryNumbers {
  /** Sessions the active routine planned for the range (null when there is no active routine). */
  planned_sessions: number | null;
  /** completed sessions / planned sessions (null when nothing was planned). */
  adherence: number | null;
  range: { from: Date; to: Date } | null;
}

export interface GymVolumeSeriesPoint {
  bucket: string;
  sessions: number;
  sets: number;
  reps: number;
  volume: number;
}

export interface GymVolumeSeries {
  period: GymVolumePeriod;
  range: { from: Date; to: Date } | null;
  data: GymVolumeSeriesPoint[];
}

export interface GymRecord {
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string | null;
  max_weight: number;
  max_weight_reps: number | null;
  estimated_1rm: number;
  best_set_volume: number;
  achieved_at: Date | null;
}

/** A single slot of the Monday-to-Sunday grid. */
export interface RoutineWeekDay {
  /** `null` when the day was never configured. */
  id: string | null;
  day_of_week: number;
  title: string | null;
  is_rest: boolean;
  notes: string | null;
  exercises: RoutineExercisePrimitives[];
}

export interface RoutineWeek {
  routine: RoutinePrimitives;
  /** Always 7 entries, ordered from Monday (1) to Sunday (7). */
  days: RoutineWeekDay[];
}

export interface BodyMetricTrendPoint {
  date: Date;
  value: number;
}

export interface BodyMetricTrend {
  metric: string;
  range: { from: Date; to: Date } | null;
  data: BodyMetricTrendPoint[];
}

export interface MuscleGroupVolumePoint {
  muscle_group: string | null;
  volume: number;
  sets: number;
  reps: number;
  sessions: number;
}

export interface MuscleGroupVolume {
  range: { from: Date; to: Date } | null;
  data: MuscleGroupVolumePoint[];
}

export interface GymCalendarDay {
  /** `YYYY-MM-DD`. */
  date: string;
  /** ISO day of week: 1 = Monday ... 7 = Sunday. */
  day_of_week: number;
  planned: boolean;
  planned_title: string | null;
  planned_routine_day_id: string | null;
  completed: boolean;
  session_id: string | null;
  volume: number;
}

export interface GymCalendar {
  year: number;
  month: number;
  routine_id: string | null;
  routine_name: string | null;
  summary: {
    planned_days: number;
    completed_days: number;
    adherence: number | null;
    total_volume: number;
  };
  data: GymCalendarDay[];
}

/** Aggregated volume of one day (used by the monthly calendar). */
export interface GymDailyVolume {
  /** `YYYY-MM-DD`. */
  date: string;
  sessions: number;
  volume: number;
  /** First completed session of the day. */
  session_id: string;
}

export interface GymLoadDay {
  /** `YYYY-MM-DD`. */
  date: string;
  sessions: number;
  duration_minutes: number;
  /** Session-RPE: `Σ (rpe × duration_minutes)`. */
  srpe: number;
}

export interface GymLoadBucket {
  /** `YYYY-MM-DD` of the first day of the bucket. */
  bucket: string;
  sessions: number;
  duration_minutes: number;
  srpe: number;
}

export interface GymLoad {
  range: { from: Date; to: Date } | null;
  /** Σ sRPE of the last 7 days of the range. */
  acute_7d: number;
  /** Σ sRPE of the last 28 days of the range, divided by 4. */
  chronic_28d_weekly_avg: number;
  /** Acute:chronic workload ratio (null when there is no chronic load). */
  acwr: number | null;
  total_srpe: number;
  data: GymLoadBucket[];
  daily: GymLoadDay[];
}

export interface GymExerciseProgressPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  max_weight: number;
  estimated_1rm: number;
  volume: number;
  sets: number;
  reps: number;
}

export interface GymExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  range: { from: Date; to: Date } | null;
  data: GymExerciseProgressPoint[];
  progression: {
    volume_change_pct: number | null;
    estimated_1rm_change_pct: number | null;
  };
}

export type { WorkoutRange };
