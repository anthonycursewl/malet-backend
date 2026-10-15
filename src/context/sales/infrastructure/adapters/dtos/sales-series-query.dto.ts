import { IsIn, IsOptional } from 'class-validator';
import { SALE_SERIES_PERIODS } from '../../../domain/constants';
import { SalesQueryDto } from './sales-query.dto';

export class SalesSeriesQueryDto extends SalesQueryDto {
  @IsOptional()
  @IsIn([...SALE_SERIES_PERIODS], {
    message: `period must be one of: ${SALE_SERIES_PERIODS.join(', ')}`,
  })
  period?: 'day' | 'week' | 'month';
}
