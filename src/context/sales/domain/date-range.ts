import { BadRequestException } from '@nestjs/common';

export interface DateRangeFilters {
  preset?: string;
  from?: string;
  to?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
  /** true => the query should use `<= to`; false => `< to` (to is an exclusive boundary). */
  inclusive: boolean;
}

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const offsetToMonday = (day + 6) % 7;
  return addDays(startOfDay(date), -offsetToMonday);
};

const isDateOnly = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Date-only values are parsed as local midnight (Date ISO parsing treats them as UTC). */
const parseDate = (value: string): Date => {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException('`from`/`to` must be a valid ISO date');
    }
    return date;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('`from`/`to` must be a valid ISO date');
  }
  return date;
};

function presetRange(preset: string, now: Date): DateRange {
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { from: today, to: now, inclusive: true };
    case 'yesterday':
      return { from: addDays(today, -1), to: today, inclusive: false };
    case 'this_week':
      return { from: startOfWeek(now), to: now, inclusive: true };
    case 'last_week': {
      const thisMonday = startOfWeek(now);
      return {
        from: addDays(thisMonday, -7),
        to: thisMonday,
        inclusive: false,
      };
    }
    case 'this_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
        inclusive: true,
      };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
        inclusive: false,
      };
    case 'last_7_days':
      return { from: addDays(today, -6), to: now, inclusive: true };
    case 'last_30_days':
      return { from: addDays(today, -29), to: now, inclusive: true };
    case 'this_year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
        inclusive: true,
      };
    default:
      throw new BadRequestException(
        `Unknown date preset "${preset}". Use one of: today, yesterday, this_week, last_week, this_month, last_month, last_7_days, last_30_days, this_year`,
      );
  }
}

/**
 * Resolves the requested date filters into a concrete range.
 * Returns `null` when no preset/from/to was provided (meaning: no date filter).
 *
 * - `preset`: common ranges (today, last_week, etc).
 * - `from` / `to`: custom range. A date-only `to` (YYYY-MM-DD) includes the whole day.
 */
export function resolveDateRange(
  filters: DateRangeFilters,
  now: Date = new Date(),
): DateRange | null {
  if (filters.preset) {
    return presetRange(filters.preset, now);
  }

  if (!filters.from && !filters.to) {
    return null;
  }

  const from = filters.from ? parseDate(filters.from) : new Date(0);

  if (!filters.to) {
    return { from, to: now, inclusive: true };
  }

  if (isDateOnly(filters.to)) {
    // A date-only `to` includes the whole day: exclusive boundary at next local midnight.
    return { from, to: addDays(parseDate(filters.to), 1), inclusive: false };
  }

  const to = parseDate(filters.to);

  if (to.getTime() < from.getTime()) {
    throw new BadRequestException('`to` must be after `from`');
  }

  return { from, to, inclusive: true };
}

export function defaultLast30Days(now: Date = new Date()): DateRange {
  return presetRange('last_30_days', now);
}
