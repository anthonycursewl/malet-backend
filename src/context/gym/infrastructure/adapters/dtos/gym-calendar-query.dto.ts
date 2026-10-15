import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GymCalendarQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Transform(({ value }) => (value != null ? Number(value) : undefined))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /** Plans against a concrete routine; defaults to the active one. */
  @IsOptional()
  @IsString()
  routine_id?: string;
}
