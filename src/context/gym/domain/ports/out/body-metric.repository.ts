import { BodyMetric } from '../../entities/body-metric.entity';
import { BodyMetricTrendPoint, WorkoutRange } from '../../types';
import { BodyMetricMetric } from '../../constants';

export const BODY_METRIC_REPOSITORY_PORT = Symbol(
  'BODY_METRIC_REPOSITORY_PORT',
);

export interface ListBodyMetricsOptions {
  user_id: string;
  take: number;
  cursor?: string;
  range?: WorkoutRange;
}

export interface BodyMetricTrendOptions {
  user_id: string;
  metric: BodyMetricMetric;
  range?: WorkoutRange;
}

export interface BodyMetricRepository {
  save(metric: BodyMetric): Promise<BodyMetric>;
  /** One entry per day: resolving by date is what makes the upsert possible. */
  findByDate(user_id: string, date: Date): Promise<BodyMetric | null>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<BodyMetric | null>;
  findMany(options: ListBodyMetricsOptions): Promise<BodyMetric[]>;
  findLatest(user_id: string): Promise<BodyMetric | null>;
  findTrend(options: BodyMetricTrendOptions): Promise<BodyMetricTrendPoint[]>;
  update(metric: BodyMetric): Promise<BodyMetric>;
  delete(id: string): Promise<BodyMetric>;
  restore(id: string): Promise<BodyMetric>;
  hardDelete(id: string): Promise<void>;
}
