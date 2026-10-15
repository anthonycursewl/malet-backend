import { DateRange } from './date-range';

export interface UserSummary {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface StoreInvitePreview {
  store: { id: string; name: string };
  inviter: UserSummary | null;
  expires_at: Date;
}

export interface ListSalesFilters {
  store_id: string;
  take?: number;
  cursor?: string;
  payment_method_id?: string;
  product_id?: string;
  preset?: string;
  from?: string;
  to?: string;
}

export interface SalesReportFilters {
  store_id: string;
  payment_method_id?: string;
  product_id?: string;
  preset?: string;
  from?: string;
  to?: string;
}

export interface SalesAggregateOptions {
  store_id: string;
  payment_method_id?: string;
  product_id?: string;
  range?: DateRange | null;
}

export interface SalesSeriesOptions extends SalesAggregateOptions {
  period: 'day' | 'week' | 'month';
}

export interface SalesSummaryNumbers {
  sales_count: number;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SalesSummary extends SalesSummaryNumbers {
  average_ticket: number;
  range: { from: string | null; to: string | null };
}

export interface SalesSeriesPoint extends SalesSummaryNumbers {
  bucket: string;
}

export interface SalesSeriesResult {
  period: 'day' | 'week' | 'month';
  from: string;
  to: string;
  data: SalesSeriesPoint[];
}
