import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import {
  AnalyticsFilters,
  DateRangeFilters,
  PeriodicFilters,
  AnalyticsQueryOptions,
  AnalyticsSummary,
  DailyPoint,
  WeeklyPoint,
  MonthlyPoint,
  QuarterlyPoint,
  YearlyPoint,
  TagBreakdown,
} from '../../domain/ports/in/analytics.usecase';

@Injectable()
export class WalletAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildBaseWhere(
    userId: string,
    filters?: AnalyticsFilters & { from?: string; to?: string },
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`a.user_id = ${userId}`,
      Prisma.sql`t.deleted_at IS NULL`,
    ];

    if (filters?.account_id) {
      conditions.push(Prisma.sql`t.account_id = ${filters.account_id}`);
    }

    if (filters?.type) {
      conditions.push(Prisma.sql`t.type = ${filters.type}`);
    }

    if (filters?.from) {
      conditions.push(Prisma.sql`t.issued_at >= ${filters.from}::date`);
    }

    if (filters?.to) {
      conditions.push(Prisma.sql`t.issued_at < (${filters.to}::date + INTERVAL '1 day')`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private buildPeriodWhere(
    userId: string,
    filters?: PeriodicFilters,
  ): { where: Prisma.Sql; year: number; month?: number } {
    const year = filters?.year ?? new Date().getFullYear();
    const month = filters?.month;
    const baseWhere = this.buildBaseWhere(userId, filters);

    const extraConditions: Prisma.Sql[] = [];

    if (month) {
      extraConditions.push(
        Prisma.sql`EXTRACT(YEAR FROM t.issued_at) = ${year} AND EXTRACT(MONTH FROM t.issued_at) = ${month}`,
      );
    } else {
      extraConditions.push(Prisma.sql`EXTRACT(YEAR FROM t.issued_at) = ${year}`);
    }

    if (extraConditions.length > 0) {
      const extra = Prisma.join(extraConditions, ' AND ');
      return { where: Prisma.sql`${baseWhere} AND ${extra}`, year, month };
    }

    return { where: baseWhere, year, month };
  }

  private buildOrderClause(options?: AnalyticsQueryOptions, defaultSort = 'date'): Prisma.Sql {
    const sortField = options?.sort_by ?? defaultSort;
    const sortOrder = options?.order ?? 'desc';

    const columnMap: Record<string, Prisma.Sql> = {
      total: Prisma.sql`total`,
      count: Prisma.sql`count`,
      date: Prisma.sql`date`,
      name: Prisma.sql`tag_name`,
    };

    const column = columnMap[sortField] ?? Prisma.sql`date`;
    return Prisma.sql`ORDER BY ${column} ${Prisma.raw(sortOrder)}`;
  }

  private buildLimitClause(options?: AnalyticsQueryOptions): Prisma.Sql {
    const limit = options?.limit ?? 366;
    return Prisma.sql`LIMIT ${limit}`;
  }

  async getSummary(
    userId: string,
    filters?: DateRangeFilters,
  ): Promise<AnalyticsSummary> {
    const where = this.buildBaseWhere(userId, filters);

    const [totals, byType, topAccount] = await Promise.all([
      this.prisma.$queryRaw<
        { total_spent: number; total_saved: number; count: number }[]
      >`
        SELECT
          COALESCE(SUM(CASE WHEN t.type != 'saving' THEN t.amount::numeric ELSE 0 END), 0)::float AS total_spent,
          COALESCE(SUM(CASE WHEN t.type = 'saving' THEN t.amount::numeric ELSE 0 END), 0)::float AS total_saved,
          COUNT(*)::int AS count
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE ${where}
      `,
      this.prisma.$queryRaw<
        { type: string; total: number; count: number }[]
      >`
        SELECT
          t.type,
          SUM(t.amount::numeric)::float AS total,
          COUNT(*)::int AS count
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE ${where}
        GROUP BY t.type
      `,
      this.prisma.$queryRaw<
        { account_id: string; name: string; total: number }[]
      >`
        SELECT
          t.account_id,
          a.name,
          SUM(t.amount::numeric)::float AS total
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE ${where}
        GROUP BY t.account_id, a.name
        ORDER BY total DESC
        LIMIT 1
      `,
    ]);

    const row = totals[0];
    return {
      total_spent: row?.total_spent ?? 0,
      total_saved: row?.total_saved ?? 0,
      net_flow: (row?.total_saved ?? 0) - (row?.total_spent ?? 0),
      transaction_count: row?.count ?? 0,
      by_type: byType.map((r) => ({
        type: r.type,
        total: r.total,
        count: r.count,
      })),
      average_per_transaction:
        (row?.count ?? 0) > 0
          ? ((row?.total_spent ?? 0) + (row?.total_saved ?? 0)) / row.count
          : 0,
      most_active_account: topAccount[0] ?? null,
    };
  }

  async getDaily(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<DailyPoint[]> {
    const { where } = this.buildPeriodWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'date');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<DailyPoint[]>`
      SELECT
        TO_CHAR(t.issued_at, 'YYYY-MM-DD') AS date,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY TO_CHAR(t.issued_at, 'YYYY-MM-DD')
      ${orderBy}
      ${limit}
    `;
  }

  async getWeekly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<WeeklyPoint[]> {
    const { where } = this.buildPeriodWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'week');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<WeeklyPoint[]>`
      SELECT
        TO_CHAR(t.issued_at, 'IYYY') || '-W' || TO_CHAR(t.issued_at, 'IW') AS week,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY TO_CHAR(t.issued_at, 'IYYY'), TO_CHAR(t.issued_at, 'IW')
      ${orderBy}
      ${limit}
    `;
  }

  async getMonthly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<MonthlyPoint[]> {
    const { where } = this.buildPeriodWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'month');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<MonthlyPoint[]>`
      SELECT
        TO_CHAR(t.issued_at, 'YYYY-MM') AS month,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY TO_CHAR(t.issued_at, 'YYYY-MM')
      ${orderBy}
      ${limit}
    `;
  }

  async getQuarterly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<QuarterlyPoint[]> {
    const { where } = this.buildPeriodWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'quarter');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<QuarterlyPoint[]>`
      SELECT
        TO_CHAR(t.issued_at, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM t.issued_at)::text AS quarter,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY TO_CHAR(t.issued_at, 'YYYY'), EXTRACT(QUARTER FROM t.issued_at)
      ${orderBy}
      ${limit}
    `;
  }

  async getYearly(
    userId: string,
    filters?: AnalyticsFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<YearlyPoint[]> {
    const where = this.buildBaseWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'year');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<YearlyPoint[]>`
      SELECT
        EXTRACT(YEAR FROM t.issued_at)::int AS year,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY EXTRACT(YEAR FROM t.issued_at)
      ${orderBy}
      ${limit}
    `;
  }

  async getByRange(
    userId: string,
    filters: DateRangeFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<DailyPoint[]> {
    const where = this.buildBaseWhere(userId, filters);
    const orderBy = this.buildOrderClause(options, 'date');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<DailyPoint[]>`
      SELECT
        TO_CHAR(t.issued_at, 'YYYY-MM-DD') AS date,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE ${where}
      GROUP BY TO_CHAR(t.issued_at, 'YYYY-MM-DD')
      ${orderBy}
      ${limit}
    `;
  }

  async getByTags(
    userId: string,
    filters?: DateRangeFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<TagBreakdown[]> {
    const baseWhere = this.buildBaseWhere(userId, { ...filters });

    const conditions: Prisma.Sql[] = [
      baseWhere,
      Prisma.sql`tt.deleted_at IS NULL`,
    ];

    const where = Prisma.join(conditions, ' AND ');

    const orderBy = this.buildOrderClause(options, 'total');
    const limit = this.buildLimitClause(options);

    return this.prisma.$queryRaw<TagBreakdown[]>`
      SELECT
        tt.id AS tag_id,
        tt.name AS tag_name,
        tt.color AS tag_color,
        t.type,
        SUM(t.amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN transaction_tag_assignment tta ON tta.transaction_id = t.id
      JOIN transaction_tag tt ON tt.id = tta.tag_id
      WHERE ${where}
      GROUP BY tt.id, tt.name, tt.color, t.type
      ${orderBy}
      ${limit}
    `;
  }
}
