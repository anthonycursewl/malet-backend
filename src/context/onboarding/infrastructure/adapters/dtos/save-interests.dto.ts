import { IsArray, IsString, ArrayMinSize, ArrayMaxSize, IsNotEmpty } from 'class-validator';

/**
 * DTO para guardar intereses del usuario
 */
export class SaveInterestsDto {
    @IsArray({ message: 'categoryIds debe ser un array' })
    @IsString({ each: true, message: 'Cada categoryId debe ser un string' })
    @ArrayMinSize(3, { message: 'Debes seleccionar al menos 3 intereses' })
    @ArrayMaxSize(10, { message: 'No puedes seleccionar más de 10 intereses' })
    @IsNotEmpty({ message: 'categoryIds es requerido' })
    categoryIds: string[];
}
