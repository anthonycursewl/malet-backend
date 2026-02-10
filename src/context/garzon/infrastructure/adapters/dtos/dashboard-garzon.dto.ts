import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para las credenciales de sesión.
 * Se usa en el body de las peticiones al dashboard.
 */
export class SessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Las cookies son requeridas' })
  cookies!: string;

  @IsString()
  @IsNotEmpty({ message: 'El token XSRF es requerido' })
  xsrfToken!: string;
}

/**
 * DTO para los parámetros de consulta del dashboard
 */
export class DashboardQueryDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'stid debe ser un número' })
  @Min(0, { message: 'stid debe ser mayor o igual a 0' })
  stid: number = 0;
}

/**
 * DTO combinado para peticiones al dashboard
 */
export class DashboardRequestDto {
  @IsNotEmpty({ message: 'La sesión es requerida' })
  session!: SessionDto;

  @Type(() => Number)
  @IsNumber({}, { message: 'stid debe ser un número' })
  @Min(0, { message: 'stid debe ser mayor o igual a 0' })
  stid: number = 0;
}
