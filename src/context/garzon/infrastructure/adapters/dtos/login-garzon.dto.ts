import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para autenticación contra el sistema Garzon (legado).
 * Valida las credenciales antes de procesarlas.
 */
export class LoginGarzonDto {
  @IsString({ message: 'El nombre de usuario debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  @MinLength(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres',
  })
  @MaxLength(50, {
    message: 'El nombre de usuario no puede exceder 50 caracteres',
  })
  username: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password: string;
}
