import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CommunityType } from '../../../domain/enums/community-type.enum';

/**
 * DTO para crear una nueva comunidad
 */
export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  description?: string;

  @IsEnum(CommunityType, {
    message: 'El tipo debe ser public, private o premium',
  })
  @IsOptional()
  type?: CommunityType = CommunityType.PUBLIC;
}
