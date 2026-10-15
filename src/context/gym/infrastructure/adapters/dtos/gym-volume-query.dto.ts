import { IsIn, IsOptional } from 'class-validator';
import { GYM_VOLUME_PERIODS, GymVolumePeriod } from '../../../domain/constants';
import { GymSummaryQueryDto } from './gym-summary-query.dto';

export class GymVolumeQueryDto extends GymSummaryQueryDto {
  /** Bucket size; defaults to `day`. */
  @IsOptional()
  @IsIn([...GYM_VOLUME_PERIODS], {
    message: `period must be one of: ${GYM_VOLUME_PERIODS.join(', ')}`,
  })
  period?: GymVolumePeriod;
}
