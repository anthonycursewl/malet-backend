import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class TaskitiAnalyticsService {
  private readonly logger = new Logger(TaskitiAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async precomputeDaily() {
    this.logger.log('Precomputing daily analytics...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      try {
        await this.computeDay(user.id, dateStr);
      } catch (error: any) {
        this.logger.error(
          `Failed to precompute analytics for user ${user.id}: ${error.message}`,
        );
      }
    }
    this.logger.log('Daily analytics precomputed');
  }

  async computeDay(userId: string, dateStr: string) {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const tasks = await this.prisma.taskiti_tasks.findMany({
      where: {
        user_id: userId,
        created_at: { lte: dayEnd },
      },
    });

    const dayTasks = tasks.filter(
      (t) => t.created_at >= dayStart && t.created_at <= dayEnd,
    );
    const completedDayTasks = tasks.filter(
      (t) =>
        t.completed &&
        t.updated_at >= dayStart &&
        t.updated_at <= dayEnd,
    );

    const tasks_created = dayTasks.length;
    const tasks_completed = completedDayTasks.length;
    const tasks_deleted = tasks.filter(
      (t) =>
        t.deleted_at &&
        t.deleted_at >= dayStart &&
        t.deleted_at <= dayEnd,
    ).length;
    const tasks_expired = tasks.filter(
      (t) =>
        !t.completed &&
        !t.deleted_at &&
        t.expires_at >= dayStart &&
        t.expires_at <= dayEnd,
    ).length;

    const priority_low = dayTasks.filter((t) => t.priority === 'low').length;
    const priority_medium = dayTasks.filter(
      (t) => t.priority === 'medium',
    ).length;
    const priority_high = dayTasks.filter((t) => t.priority === 'high').length;
    const priority_urgent = dayTasks.filter(
      (t) => t.priority === 'urgent',
    ).length;

    let avg_completion_hours: number | null = null;
    const completedWithTime = completedDayTasks.filter((t) => t.created_at);
    if (completedWithTime.length > 0) {
      const totalHours = completedWithTime.reduce((sum, t) => {
        const diffMs = t.updated_at.getTime() - t.created_at.getTime();
        return sum + diffMs / 3600000;
      }, 0);
      avg_completion_hours =
        Math.round((totalHours / completedWithTime.length) * 100) / 100;
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);

    try {
      await this.prisma.taskiti_analytics.upsert({
        where: { user_id_date: { user_id: userId, date } },
        create: {
          user_id: userId,
          date,
          tasks_created,
          tasks_completed,
          tasks_deleted,
          tasks_expired,
          priority_low,
          priority_medium,
          priority_high,
          priority_urgent,
          avg_completion_hours,
        },
        update: {
          tasks_created,
          tasks_completed,
          tasks_deleted,
          tasks_expired,
          priority_low,
          priority_medium,
          priority_high,
          priority_urgent,
          avg_completion_hours,
        },
      });
    } catch {
      // table doesn't exist yet — skip precomputation, compute on-the-fly
    }
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  async getAnalytics(userId: string, from: string, to: string) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return this.getGlobalOverview(userId);
    }

    const today = new Date().toISOString().slice(0, 10);
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const dayStr = cursor.toISOString().slice(0, 10);
      if (dayStr >= today) {
        await this.computeDay(userId, dayStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    let records: any[] = [];
    try {
      records = await this.prisma.taskiti_analytics.findMany({
        where: {
          user_id: userId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: 'asc' },
      });
    } catch {
      // table doesn't exist, compute from raw data below
    }

    const daily = records.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      created: r.tasks_created,
      completed: r.tasks_completed,
      deleted: r.tasks_deleted,
      expired: r.tasks_expired,
      completion_rate:
        r.tasks_created > 0
          ? Math.round((r.tasks_completed / r.tasks_created) * 100)
          : 0,
    }));

    const weeklyMap = new Map<
      string,
      { created: number; completed: number; deleted: number; expired: number }
    >();
    for (const r of records) {
      const key = this.getWeekNumber(r.date);
      const w = weeklyMap.get(key) || {
        created: 0,
        completed: 0,
        deleted: 0,
        expired: 0,
      };
      w.created += r.tasks_created;
      w.completed += r.tasks_completed;
      w.deleted += r.tasks_deleted;
      w.expired += r.tasks_expired;
      weeklyMap.set(key, w);
    }
    const weekly = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      ...data,
      completion_rate:
        data.created > 0
          ? Math.round((data.completed / data.created) * 100)
          : 0,
    }));

    const monthlyMap = new Map<
      string,
      { created: number; completed: number; deleted: number; expired: number }
    >();
    for (const r of records) {
      const key = this.getMonthKey(r.date);
      const m = monthlyMap.get(key) || {
        created: 0,
        completed: 0,
        deleted: 0,
        expired: 0,
      };
      m.created += r.tasks_created;
      m.completed += r.tasks_completed;
      m.deleted += r.tasks_deleted;
      m.expired += r.tasks_expired;
      monthlyMap.set(key, m);
    }
    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      ...data,
      completion_rate:
        data.created > 0
          ? Math.round((data.completed / data.created) * 100)
          : 0,
    }));

    const aggregated = {
      tasks_created: 0,
      tasks_completed: 0,
      tasks_deleted: 0,
      tasks_expired: 0,
      priority_low: 0,
      priority_medium: 0,
      priority_high: 0,
      priority_urgent: 0,
    };
    let completionHoursSum = 0;
    let completionHoursCount = 0;

    for (const r of records) {
      aggregated.tasks_created += r.tasks_created;
      aggregated.tasks_completed += r.tasks_completed;
      aggregated.tasks_deleted += r.tasks_deleted;
      aggregated.tasks_expired += r.tasks_expired;
      aggregated.priority_low += r.priority_low;
      aggregated.priority_medium += r.priority_medium;
      aggregated.priority_high += r.priority_high;
      aggregated.priority_urgent += r.priority_urgent;
      if (r.avg_completion_hours !== null) {
        completionHoursSum += r.avg_completion_hours * r.tasks_completed;
        completionHoursCount += r.tasks_completed;
      }
    }

    const completion_rate =
      aggregated.tasks_created > 0
        ? Math.round(
            (aggregated.tasks_completed / aggregated.tasks_created) * 100,
          )
        : 0;

    const avg_completion_hours =
      completionHoursCount > 0
        ? Math.round((completionHoursSum / completionHoursCount) * 100) / 100
        : null;

    const streaks = await this.computeStreaks(userId);

    const allUserTasks = await this.prisma.taskiti_tasks.findMany({
      where: { user_id: userId },
      select: { completed: true, deleted_at: true, priority: true, expires_at: true },
    });

    const total = allUserTasks.length;
    const completed = allUserTasks.filter((t) => t.completed).length;
    const activeTasks = allUserTasks.filter(
      (t) => !t.completed && !t.deleted_at,
    ).length;
    const deleted = allUserTasks.filter((t) => t.deleted_at).length;
    const overdue = allUserTasks.filter(
      (t) => !t.completed && !t.deleted_at && t.expires_at < new Date(),
    ).length;

    const priorityDist = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of allUserTasks) {
      if (t.priority === 'low') priorityDist.low++;
      else if (t.priority === 'medium') priorityDist.medium++;
      else if (t.priority === 'high') priorityDist.high++;
      else if (t.priority === 'urgent') priorityDist.urgent++;
    }

    return {
      daily,
      weekly,
      monthly,
      summary: {
        ...aggregated,
        completion_rate,
        avg_completion_hours,
      },
      streaks,
      charts: {
        completion_trend: daily.map((d) => ({
          x: d.date,
          created: d.created,
          completed: d.completed,
          rate: d.completion_rate,
        })),
        weekly_trend: weekly.map((w) => ({
          x: w.week,
          created: w.created,
          completed: w.completed,
          rate: w.completion_rate,
        })),
        monthly_trend: monthly.map((m) => ({
          x: m.month,
          created: m.created,
          completed: m.completed,
          rate: m.completion_rate,
        })),
        distribution: {
          by_priority: [
            { name: 'Low', value: priorityDist.low, color: '#8BC34A' },
            { name: 'Medium', value: priorityDist.medium, color: '#FFC107' },
            { name: 'High', value: priorityDist.high, color: '#FF9800' },
            { name: 'Urgent', value: priorityDist.urgent, color: '#F44336' },
          ],
          by_status: [
            { name: 'Completed', value: completed, color: '#4CAF50' },
            { name: 'Active', value: activeTasks, color: '#2196F3' },
            { name: 'Overdue', value: overdue, color: '#F44336' },
            { name: 'Deleted', value: deleted, color: '#9E9E9E' },
          ],
        },
      },
    };
  }

  private async computeStreaks(userId: string) {
    let records: { date: Date; tasks_completed: number }[] = [];
    try {
      records = await this.prisma.taskiti_analytics.findMany({
        where: { user_id: userId },
        select: { date: true, tasks_completed: true },
        orderBy: { date: 'desc' },
      });
    } catch {
      // table doesn't exist yet
    }

    let current = 0;
    let longest = 0;
    let streak = 0;
    let foundBreak = false;

    for (const r of records) {
      if (r.tasks_completed > 0) {
        streak++;
        if (!foundBreak) current = streak;
      } else {
        if (!foundBreak) {
          current = streak;
          streak = 0;
          foundBreak = true;
        } else {
          longest = Math.max(longest, streak);
          streak = 0;
        }
      }
    }
    longest = Math.max(longest, streak);

    return { current, longest };
  }

  private async getGlobalOverview(userId: string) {
    const rows = await this.prisma.taskiti_tasks.findMany({
      where: { user_id: userId },
      select: {
        completed: true,
        deleted_at: true,
        priority: true,
        expires_at: true,
      },
    });

    const total = rows.length;
    const completed = rows.filter((t) => t.completed).length;
    const active = rows.filter((t) => !t.completed && !t.deleted_at).length;
    const deleted = rows.filter((t) => t.deleted_at).length;
    const overdue = rows.filter(
      (t) =>
        !t.completed && !t.deleted_at && t.expires_at < new Date(),
    ).length;

    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of rows) {
      if (t.priority === 'low') priorityCounts.low++;
      else if (t.priority === 'medium') priorityCounts.medium++;
      else if (t.priority === 'high') priorityCounts.high++;
      else if (t.priority === 'urgent') priorityCounts.urgent++;
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const streaks = await this.computeStreaks(userId);

    return {
      overview: {
        total,
        completed,
        active,
        deleted,
        overdue,
        completion_rate: completionRate,
      },
      priority_distribution: priorityCounts,
      streaks,
      charts: {
        distribution: {
          by_priority: [
            { name: 'Low', value: priorityCounts.low, color: '#8BC34A' },
            { name: 'Medium', value: priorityCounts.medium, color: '#FFC107' },
            { name: 'High', value: priorityCounts.high, color: '#FF9800' },
            { name: 'Urgent', value: priorityCounts.urgent, color: '#F44336' },
          ],
          by_status: [
            { name: 'Completed', value: completed, color: '#4CAF50' },
            { name: 'Active', value: active, color: '#2196F3' },
            { name: 'Overdue', value: overdue, color: '#F44336' },
            { name: 'Deleted', value: deleted, color: '#9E9E9E' },
          ],
        },
      },
    };
  }

  async refreshNow() {
    await this.precomputeDaily();
    return { ok: true };
  }
}
