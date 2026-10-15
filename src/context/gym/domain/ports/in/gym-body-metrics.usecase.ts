import { BodyMetric } from '../../entities/body-metric.entity';
import { BodyMetricTrend, GymDateFilters } from '../../types';
import { BodyMetricMetric } from '../../constants';
import { ListBodyMetricsOptions } from '../out/body-metric.repository';
import { CreateBodyMetricDto } from '../../../application/dtos/create-body-metric.dto';
import { UpdateBodyMetricDto } from '../../../application/dtos/update-body-metric.dto';

export const GYM_BODY_METRICS_USECASE = Symbol('GYM_BODY_METRICS_USECASE');

export interface BodyMetricTrendQuery extends GymDateFilters {
  metric: BodyMetricMetric;
}

export interface GymBodyMetricsUseCase {
  /** Creates the entry of that date or replaces it when it already exists. */
  upsert(user_id: string, dto: CreateBodyMetricDto): Promise<BodyMetric>;
  list(options: ListBodyMetricsOptions): Promise<BodyMetric[]>;
  /** Most recent entry, or `null`. */
  latest(user_id: string): Promise<BodyMetric | null>;
  trend(user_id: string, query: BodyMetricTrendQuery): Promise<BodyMetricTrend>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<BodyMetric>;
  update(
    user_id: string,
    id: string,
    dto: UpdateBodyMetricDto,
  ): Promise<BodyMetric>;
  softDelete(user_id: string, id: string): Promise<BodyMetric>;
  restore(user_id: string, id: string): Promise<BodyMetric>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
