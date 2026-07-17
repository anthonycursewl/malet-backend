import { SyncBatchDto } from './sync-batch.dto';
import { IsArray, IsOptional, ValidateNested, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncRequestDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchDto)
  batches?: SyncBatchDto[];

  // legacy single-batch fields
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  tasks?: any[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deleted_ids?: string[];

  @IsOptional()
  @IsString()
  last_sync_at?: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
