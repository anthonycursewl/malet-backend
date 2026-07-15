import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ALLOWED_SYNC_ENTITIES } from './sync-entity.types';

export class PushOpDto {
  @IsString()
  client_id: string;

  @IsString()
  @IsIn(ALLOWED_SYNC_ENTITIES)
  entity_type: string;

  @IsString()
  @IsIn(['create', 'update', 'delete'])
  operation: 'create' | 'update' | 'delete';

  @IsObject()
  payload: Record<string, any>;

  @IsISO8601()
  client_updated_at: string;
}

export class PushRequestDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsISO8601()
  client_clock?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PushOpDto)
  ops: PushOpDto[];
}
