import { BadRequestException } from '@nestjs/common';
import {
  DateRangeFilters,
  resolveDateRange,
} from '../../sales/domain/date-range';

export interface WorkoutRange {
  from: Date;
  to: Date;
  /** true => use `<= to`; false => `< to` (exclusive boundary). */
  inclusive: boolean;
}

/**
 * Parses a workout date (`YYYY-MM-DD`) into UTC midnight. The `date` column
 * keeps no time, so every workout date is handled in UTC.
 */
export function parseWorkoutDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) {
    throw new BadRequestException('date must be a valid ISO date (YYYY-MM-DD)');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('date must be a valid ISO date (YYYY-MM-DD)');
  }

  return date;
}

/**
 * Convierte a medianoche UTC usando las **partes UTC** de la fecha: la columna
 * `date` guarda una fecha sin hora y todo el módulo trabaja en UTC, así que usar
 * las partes locales desplazaba el día en zonas UTC−X (las sesiones nocturnas
 * quedaban en "mañana" y los reportes las excluían).
 */
const toUtcMidnight = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

/**
 * Resolves the shared `preset`/`from`/`to` filters into UTC midnights, so they
 * compare correctly against the `date` column.
 */
export function resolveWorkoutRange(
  filters: DateRangeFilters,
): WorkoutRange | null {
  const range = resolveDateRange(filters);
  if (!range) {
    return null;
  }

  return {
    from: toUtcMidnight(range.from),
    to: toUtcMidnight(range.to),
    inclusive: range.inclusive,
  };
}

/** Default report window: the last 30 days. */
export function defaultWorkoutRange(): WorkoutRange {
  const range = resolveDateRange({ preset: 'last_30_days' });
  return {
    from: toUtcMidnight(range!.from),
    to: toUtcMidnight(range!.to),
    inclusive: range!.inclusive,
  };
}

const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` in UTC. */
export const toDateOnly = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

/** Inclusive/exclusive UTC month boundaries, matching the `date` column. */
export function monthRange(
  year: number,
  month: number,
): { from: Date; to: Date } {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new BadRequestException('year must be between 2000 and 2100');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestException('month must be between 1 and 12');
  }

  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** ISO day of week: 1 = Monday ... 7 = Sunday. */
export function isoDayOfWeek(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}
