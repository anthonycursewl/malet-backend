import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { CommunityType } from '../../../domain/enums/community-type.enum';

/**
 * DTO para buscar comunidades
 */
export class SearchCommunitiesDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsEnum(CommunityType, {
    message: 'El tipo debe ser public, private o premium',
  })
  @IsOptional()
  type?: CommunityType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  limit?: number = 20;
}
