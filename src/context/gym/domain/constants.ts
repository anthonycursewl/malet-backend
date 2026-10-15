export const GYM_MODULE_KEY = 'gym';

/** Muscle groups used for volume-by-muscle metrics. */
export const GYM_MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'glutes',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'cardio',
  'mobility',
] as const;
export type GymMuscleGroup = (typeof GYM_MUSCLE_GROUPS)[number];

export const GYM_EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'cardio_machine',
  'other',
] as const;
export type GymEquipment = (typeof GYM_EQUIPMENT)[number];

export const GYM_EXERCISE_TYPES = ['strength', 'cardio', 'mobility'] as const;
export type GymExerciseType = (typeof GYM_EXERCISE_TYPES)[number];

export const GYM_SESSION_STATUSES = [
  'in_progress',
  'completed',
  'skipped',
] as const;
export type GymSessionStatus = (typeof GYM_SESSION_STATUSES)[number];

/** ISO days of week: 1 = Monday ... 7 = Sunday. */
export const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const GYM_VOLUME_PERIODS = ['day', 'week', 'month'] as const;
export type GymVolumePeriod = (typeof GYM_VOLUME_PERIODS)[number];

/** Body metrics that can be charted over time. */
export const BODY_METRIC_TRENDS = [
  'weight_kg',
  'body_fat_pct',
  'muscle_mass_kg',
] as const;
export type BodyMetricMetric = (typeof BODY_METRIC_TRENDS)[number];

/** Tape measurements allowed inside `measurements` (all in cm). */
export const BODY_MEASUREMENT_KEYS = [
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hip',
  'arm',
  'thigh',
  'calf',
] as const;
export type BodyMeasurementKey = (typeof BODY_MEASUREMENT_KEYS)[number];

export const RPE_MIN = 1;
export const RPE_MAX = 10;
export const MAX_SETS = 50;
export const MAX_REPS = 1000;
export const MAX_TARGET_WEIGHT = 9999.99;
export const MAX_REST_SECONDS = 3600;
export const MAX_DURATION_SECONDS = 86400;
export const MAX_WEIGHT_KG = 999.99;
export const MAX_HEIGHT_CM = 300;
export const MAX_BODY_FAT_PCT = 100;
export const MAX_MEASUREMENT_CM = 500;

export const DEFAULT_LIST_TAKE = 10;
export const MAX_LIST_TAKE = 100;
