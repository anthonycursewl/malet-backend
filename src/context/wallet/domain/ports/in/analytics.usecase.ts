import { TransactionType, SortField, SortOrder } from '../../constants';

export const WALLET_ANALYTICS_USECASE = 'WALLET_ANALYTICS_USECASE';

export interface AnalyticsFilters {
  account_id?: string;
  type?: TransactionType;
}

export interface DateRangeFilters extends AnalyticsFilters {
  from?: string;
  to?: string;
}

export interface PeriodicFilters extends AnalyticsFilters {
  year?: number;
  month?: number;
}

export interface AnalyticsQueryOptions {
  sort_by?: SortField;
  order?: SortOrder;
  limit?: number;
}

export interface DailyPoint {
  date: string;
  total: number;
  count: number;
}

export interface WeeklyPoint {
  week: string;
  total: number;
  count: number;
}

export interface MonthlyPoint {
  month: string;
  total: number;
  count: number;
}

export interface QuarterlyPoint {
  quarter: string;
  total: number;
  count: number;
}

export interface YearlyPoint {
  year: number;
  total: number;
  count: number;
}

export interface TagBreakdown {
  tag_id: string;
  tag_name: string;
  tag_color: string | null;
  type: string;
  total: number;
  count: number;
}

export interface TypeBreakdown {
  type: string;
  total: number;
  count: number;
}

export interface AnalyticsSummary {
  total_spent: number;
  total_saved: number;
  net_flow: number;
  transaction_count: number;
  by_type: TypeBreakdown[];
  average_per_transaction: number;
  most_active_account: { account_id: string; name: string; total: number } | null;
}

export interface WalletAnalyticsUseCase {
  getSummary(userId: string, filters?: DateRangeFilters): Promise<AnalyticsSummary>;
  getDaily(userId: string, filters?: PeriodicFilters, options?: AnalyticsQueryOptions): Promise<DailyPoint[]>;
  getWeekly(userId: string, filters?: PeriodicFilters, options?: AnalyticsQueryOptions): Promise<WeeklyPoint[]>;
  getMonthly(userId: string, filters?: PeriodicFilters, options?: AnalyticsQueryOptions): Promise<MonthlyPoint[]>;
  getQuarterly(userId: string, filters?: PeriodicFilters, options?: AnalyticsQueryOptions): Promise<QuarterlyPoint[]>;
  getYearly(userId: string, filters?: AnalyticsFilters, options?: AnalyticsQueryOptions): Promise<YearlyPoint[]>;
  getByRange(userId: string, filters: DateRangeFilters, options?: AnalyticsQueryOptions): Promise<DailyPoint[]>;
  getByTags(userId: string, filters?: DateRangeFilters, options?: AnalyticsQueryOptions): Promise<TagBreakdown[]>;
}
