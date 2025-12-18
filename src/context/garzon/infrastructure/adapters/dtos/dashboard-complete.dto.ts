import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para obtener el dashboard completo con autenticación incluida.
 * Envías credenciales y recibes sesión + usuario + dashboard todo junto.
 */
export class DashboardCompleteRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'El username es requerido' })
    username!: string;

    @IsString()
    @IsNotEmpty({ message: 'El password es requerido' })
    password!: string;

    @Type(() => Number)
    @IsNumber({}, { message: 'stid debe ser un número' })
    @Min(0, { message: 'stid debe ser mayor o igual a 0' })
    stid: number = 0;
}
