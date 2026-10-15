import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { DATE_PRESETS } from '../../../../sales/domain/constants';

/** Shared date filters for the gym reports. */
export class GymSummaryQueryDto {
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
