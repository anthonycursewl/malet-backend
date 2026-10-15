import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { DATE_PRESETS } from '../../../../sales/domain/constants';
import {
  BODY_METRIC_TRENDS,
  BodyMetricMetric,
} from '../../../domain/constants';

export class BodyMetricTrendQueryDto {
  /** Metric to chart over time. */
  @IsIn([...BODY_METRIC_TRENDS], {
    message: `metric must be one of: ${BODY_METRIC_TRENDS.join(', ')}`,
  })
  metric: BodyMetricMetric;

  @IsOptional()
  @IsIn([...DATE_PRESETS], {
    message: `preset must be one of: ${DATE_PRESETS.join(', ')}`,
  })
  preset?: string;

  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO date' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO date' })
  to?: string;
}
