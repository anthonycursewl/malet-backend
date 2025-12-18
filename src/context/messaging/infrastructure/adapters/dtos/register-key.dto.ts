import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para registrar una clave pública
 */
export class RegisterKeyDto {
    @IsString()
    @IsNotEmpty({ message: 'deviceId es requerido' })
    deviceId: string;

    @IsString()
    @IsNotEmpty({ message: 'publicKey es requerido' })
    publicKey: string;

    @IsString()
    @IsNotEmpty({ message: 'keyFingerprint es requerido' })
    keyFingerprint: string;
}
