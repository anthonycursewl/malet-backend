import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GymCalendarQuery,
  GymRecordsQuery,
  GymReportsUseCase,
} from '../domain/ports/in/gym-reports.usecase';
import { Routine } from '../domain/entities/routine.entity';
import {
  GymCalendar,
  GymCalendarDay,
  GymDateFilters,
  GymExerciseProgress,
  GymLoad,
  GymLoadBucket,
  GymLoadDay,
  GymRecord,
  GymSummary,
  GymVolumeSeries,
  MuscleGroupVolume,
  WorkoutRange,
} from '../domain/types';
import { GymVolumePeriod } from '../domain/constants';
import { round2 } from '../domain/progress';
import {
  addDays,
  daysInMonth,
  defaultWorkoutRange,
  isoDayOfWeek,
  monthRange,
  resolveWorkoutRange,
  toDateOnly,
} from '../domain/workout-date';
import {
  SESSION_REPOSITORY_PORT,
  SessionRepository,
} from '../domain/ports/out/session.repository';
import {
  ROUTINE_REPOSITORY_PORT,
  RoutineRepository,
} from '../domain/ports/out/routine.repository';
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepository,
} from '../domain/ports/out/exercise.repository';

const MS_PER_DAY = 86_400_000;

@Injectable()
export class GymReportsService implements GymReportsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepository,
    @Inject(ROUTINE_REPOSITORY_PORT)
    private readonly routineRepository: RoutineRepository,
    @Inject(EXERCISE_REPOSITORY_PORT)
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  async summary(user_id: string, filters: GymDateFilters): Promise<GymSummary> {
    const range = resolveWorkoutRange(filters) ?? defaultWorkoutRange();

    const numbers = await this.sessionRepository.getSummaryNumbers({
      user_id,
      range,
    });

    const activeRoutine = await this.routineRepository.findActive(user_id);
    const planned = this.plannedSessions(activeRoutine, range);
    const adherence =
      activeRoutine && planned > 0
        ? round2(numbers.sessions_count / planned)
        : null;

    return {
      ...numbers,
      planned_sessions: activeRoutine ? planned : null,
      adherence,
      range: { from: range.from, to: range.to },
    };
  }

  async volumeSeries(
    user_id: string,
    filters: GymDateFilters,
    period: GymVolumePeriod,
  ): Promise<GymVolumeSeries> {
    const range = resolveWorkoutRange(filters) ?? defaultWorkoutRange();

    const data = await this.sessionRepository.getVolumeSeries({
      user_id,
      period,
      range,
    });

    return {
      period,
      range: { from: range.from, to: range.to },
      data,
    };
  }

  async muscleGroups(
    user_id: string,
    filters: GymDateFilters,
  ): Promise<MuscleGroupVolume> {
    const range = resolveWorkoutRange(filters) ?? defaultWorkoutRange();

    const data = await this.sessionRepository.getMuscleGroupVolume({
      user_id,
      range,
    });

    return { range: { from: range.from, to: range.to }, data };
  }

  async records(user_id: string, query: GymRecordsQuery): Promise<GymRecord[]> {
    return this.sessionRepository.getRecords({
      user_id,
      muscle_group: query.muscle_group,
      limit: query.limit,
    });
  }

  async calendar(
    user_id: string,
    query: GymCalendarQuery,
  ): Promise<GymCalendar> {
    const { from, to } = monthRange(query.year, query.month);
    const range: WorkoutRange = { from, to, inclusive: false };

    const routine = query.routine_id
      ? await this.requireRoutine(user_id, query.routine_id)
      : await this.routineRepository.findActive(user_id);

    const daily = await this.sessionRepository.getDailyVolume({
      user_id,
      range,
    });
    const completedByDate = new Map(
      daily.map((row) => [
        row.date,
        { session_id: row.session_id, volume: round2(row.volume) },
      ]),
    );

    const total = daysInMonth(query.year, query.month);
    const data: GymCalendarDay[] = [];
    let plannedDays = 0;
    let completedDays = 0;
    let totalVolume = 0;

    for (let day = 1; day <= total; day++) {
      const date = new Date(Date.UTC(query.year, query.month - 1, day));
      const key = toDateOnly(date);
      const dayOfWeek = isoDayOfWeek(date);
      const plannedDay = routine?.getDay(dayOfWeek);
      const planned = !!plannedDay && !plannedDay.isRest();
      const completed = completedByDate.get(key);

      if (planned) {
        plannedDays += 1;
      }
      if (completed) {
        completedDays += 1;
        totalVolume = round2(totalVolume + completed.volume);
      }

      data.push({
        date: key,
        day_of_week: dayOfWeek,
        planned,
        planned_title: planned ? plannedDay!.getTitle() : null,
        planned_routine_day_id: planned ? plannedDay!.getId() : null,
        completed: !!completed,
        session_id: completed?.session_id ?? null,
        volume: completed?.volume ?? 0,
      });
    }

    return {
      year: query.year,
      month: query.month,
      routine_id: routine?.getId() ?? null,
      routine_name: routine?.getName() ?? null,
      summary: {
        planned_days: plannedDays,
        completed_days: completedDays,
        adherence: plannedDays ? round2(completedDays / plannedDays) : null,
        total_volume: totalVolume,
      },
      data,
    };
  }

  async load(
    user_id: string,
    filters: GymDateFilters,
    period: GymVolumePeriod,
  ): Promise<GymLoad> {
    const range = resolveWorkoutRange(filters) ?? defaultWorkoutRange();

    // The chronic window reaches 28 days back, before the requested range.
    const extended: WorkoutRange = {
      from: addDays(range.from, -28),
      to: range.to,
      inclusive: range.inclusive,
    };

    const rows = await this.sessionRepository.getDailyLoad({
      user_id,
      range: extended,
    });
    const byDate = new Map(rows.map((row) => [row.date, row]));

    const endDate = range.to;
    const acute = this.sumSrpe(byDate, addDays(endDate, -6), endDate);
    const chronicTotal = this.sumSrpe(byDate, addDays(endDate, -27), endDate);
    const chronic = round2(chronicTotal / 4);

    const fromKey = toDateOnly(range.from);
    const toKey = toDateOnly(endDate);
    const daily: GymLoadDay[] = rows
      .filter((row) =>
        range.inclusive
          ? row.date >= fromKey && row.date <= toKey
          : row.date >= fromKey && row.date < toKey,
      )
      .map((row) => ({ ...row, srpe: round2(row.srpe) }));

    const buckets = new Map<string, GymLoadBucket>();
    for (const row of daily) {
      const key = this.bucketKey(row.date, period);
      const bucket = buckets.get(key) ?? {
        bucket: key,
        sessions: 0,
        duration_minutes: 0,
        srpe: 0,
      };
      bucket.sessions += row.sessions;
      bucket.duration_minutes += row.duration_minutes;
      bucket.srpe = round2(bucket.srpe + row.srpe);
      buckets.set(key, bucket);
    }

    return {
      range: { from: range.from, to: range.to },
      acute_7d: round2(acute),
      chronic_28d_weekly_avg: chronic,
      acwr: chronic > 0 ? round2(acute / chronic) : null,
      total_srpe: round2(daily.reduce((sum, row) => sum + row.srpe, 0)),
      data: [...buckets.values()].sort((a, b) =>
        a.bucket.localeCompare(b.bucket),
      ),
      daily,
    };
  }

  async exerciseProgress(
    user_id: string,
    exercise_id: string,
    filters: GymDateFilters,
  ): Promise<GymExerciseProgress> {
    const range = resolveWorkoutRange(filters) ?? defaultWorkoutRange();

    const exercise = await this.exerciseRepository.findById(
      user_id,
      exercise_id,
      true,
    );
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const data = await this.sessionRepository.getExerciseProgress({
      user_id,
      exercise_id,
      range,
    });

    const first = data[0];
    const last = data[data.length - 1];

    return {
      exercise_id,
      exercise_name: exercise.getName(),
      muscle_group: exercise.getMuscleGroup(),
      range: { from: range.from, to: range.to },
      data,
      progression: {
        volume_change_pct: this.changePct(first?.volume, last?.volume),
        estimated_1rm_change_pct: this.changePct(
          first?.estimated_1rm,
          last?.estimated_1rm,
        ),
      },
    };
  }

  private sumSrpe(
    byDate: Map<string, GymLoadDay>,
    from: Date,
    to: Date,
  ): number {
    let total = 0;
    for (
      let date = from;
      date.getTime() <= to.getTime();
      date = addDays(date, 1)
    ) {
      total += byDate.get(toDateOnly(date))?.srpe ?? 0;
    }
    return total;
  }

  private bucketKey(date: string, period: GymVolumePeriod): string {
    if (period === 'day') {
      return date;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (period === 'month') {
      return toDateOnly(
        new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1)),
      );
    }

    const iso = isoDayOfWeek(parsed);
    return toDateOnly(addDays(parsed, -(iso - 1)));
  }

  private changePct(first?: number, last?: number): number | null {
    if (first == null || last == null || first <= 0) {
      return null;
    }

    return round2(((last - first) / first) * 100);
  }

  private async requireRoutine(
    user_id: string,
    routine_id: string,
  ): Promise<Routine> {
    const routine = await this.routineRepository.findById(user_id, routine_id);
    if (!routine) {
      throw new NotFoundException('Routine not found');
    }
    return routine;
  }

  /**
   * Sessions the active routine planned for the range. It is an estimate:
   * non-rest days per week times the number of weeks covered by the range.
   */
  private plannedSessions(
    routine: Routine | null,
    range: WorkoutRange,
  ): number {
    if (!routine) {
      return 0;
    }

    const perWeek = routine.getDays().filter((day) => !day.isRest()).length;
    if (perWeek === 0) {
      return 0;
    }

    const days = Math.max(
      1,
      Math.round((range.to.getTime() - range.from.getTime()) / MS_PER_DAY) + 1,
    );

    return Math.round((days / 7) * perWeek);
  }
}
