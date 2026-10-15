import { Inject, Injectable } from '@nestjs/common';
import {
  SalesReportsUseCase,
  SalesSeriesParams,
} from '../domain/ports/in/sales-reports.usecase';
import {
  SalesReportFilters,
  SalesSeriesResult,
  SalesSummary,
} from '../domain/types';
import { defaultLast30Days, resolveDateRange } from '../domain/date-range';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class SalesReportsService implements SalesReportsUseCase {
  constructor(
    @Inject(SALE_REPOSITORY_PORT)
    private readonly saleRepository: SaleRepository,
  ) {}

  async summary(filters: SalesReportFilters): Promise<SalesSummary> {
    const range = resolveDateRange(filters);

    const numbers = await this.saleRepository.getSummary({
      store_id: filters.store_id,
      payment_method_id: filters.payment_method_id,
      product_id: filters.product_id,
      range,
    });

    return {
      sales_count: numbers.sales_count,
      units_sold: numbers.units_sold,
      revenue: numbers.revenue,
      cost: numbers.cost,
      profit: numbers.profit,
      average_ticket:
        numbers.sales_count > 0
          ? round2(numbers.revenue / numbers.sales_count)
          : 0,
      range: {
        from: range ? range.from.toISOString() : null,
        to: range ? range.to.toISOString() : null,
      },
    };
  }

  async series(params: SalesSeriesParams): Promise<SalesSeriesResult> {
    const period: 'day' | 'week' | 'month' = params.period ?? 'day';
    // Without an explicit range a series could return unlimited buckets,
    // so it defaults to the last 30 days.
    const range = resolveDateRange(params) ?? defaultLast30Days();

    const data = await this.saleRepository.getSeries({
      store_id: params.store_id,
      payment_method_id: params.payment_method_id,
      product_id: params.product_id,
      range,
      period,
    });

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      data,
    };
  }
}
