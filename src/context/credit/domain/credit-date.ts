import { BadRequestException } from '@nestjs/common';

/**
 * Parses a due date into UTC midnight of that day.
 * `@db.Date` only keeps the date part, so all calendar math is done in UTC.
 */
export function parseDueDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) {
    throw new BadRequestException(
      'due_date must be a valid ISO date (YYYY-MM-DD)',
    );
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
    throw new BadRequestException(
      'due_date must be a valid ISO date (YYYY-MM-DD)',
    );
  }

  return date;
}

/** Inclusive month range over `due_date`, with an exclusive `to` boundary. */
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
