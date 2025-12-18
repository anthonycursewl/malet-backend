import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para obtener las wallets de un cliente
 */
export class GetClientWalletDto {
    @Type(() => Number)
    @IsNumber({}, { message: 'El ID del cliente debe ser un número' })
    @Min(1, { message: 'El ID del cliente debe ser mayor a 0' })
    @IsNotEmpty({ message: 'El ID del cliente es requerido' })
    clientId!: number;
}

/**
 * Información de una wallet para solicitar token
 */
export interface WalletTokenRequestItem {
    id: number;
    moneda: number;
    client_id: number;
}


