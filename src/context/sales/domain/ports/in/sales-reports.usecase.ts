import {
  SalesReportFilters,
  SalesSeriesResult,
  SalesSummary,
} from '../../types';

export const SALES_REPORTS_USECASE = Symbol('SALES_REPORTS_USECASE');

export interface SalesSeriesParams extends SalesReportFilters {
  period?: 'day' | 'week' | 'month';
}

export interface SalesReportsUseCase {
  /** Aggregated numbers for a range (defaults to all time when no range is given). */
  summary(filters: SalesReportFilters): Promise<SalesSummary>;
  /** Sales bucketed by day/week/month (defaults to the last 30 days). */
  series(params: SalesSeriesParams): Promise<SalesSeriesResult>;
}
