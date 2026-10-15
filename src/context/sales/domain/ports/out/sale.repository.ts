import { Sale } from '../../entities/sale.entity';
import { DateRange } from '../../date-range';
import {
  SalesAggregateOptions,
  SalesSeriesOptions,
  SalesSeriesPoint,
  SalesSummaryNumbers,
} from '../../types';

export const SALE_REPOSITORY_PORT = Symbol('SALE_REPOSITORY_PORT');

export interface ListSalesOptions {
  store_id: string;
  take?: number;
  cursor?: string;
  payment_method_id?: string;
  product_id?: string;
  range?: DateRange | null;
}

export interface SaleRepository {
  save(sale: Sale): Promise<Sale>;
  findById(
    store_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<Sale | null>;
  findMany(options: ListSalesOptions): Promise<Sale[]>;
  update(sale: Sale): Promise<Sale>;
  delete(id: string): Promise<Sale>;
  restore(id: string): Promise<Sale>;
  hardDelete(id: string): Promise<void>;
  getSummary(options: SalesAggregateOptions): Promise<SalesSummaryNumbers>;
  getSeries(options: SalesSeriesOptions): Promise<SalesSeriesPoint[]>;
}
