import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
    ClientWalletResponse,
    GetWalletParams,
    GenerateWalletTokenParams,
    WalletTokenResponse,
} from '../domain/entities/wallet.entity';
import { WalletGarzonUseCase } from '../domain/ports/in/wallet-garzon.usecase';
import {
    WALLET_GARZON_REPOSITORY,
    WalletGarzonRepository,
} from '../domain/ports/out/wallet-garzon.repository';

/**
 * Servicio de aplicación para el manejo de Wallets de SuperGarzon.
 * Implementa el caso de uso de consulta de wallets.
 */
@Injectable()
export class WalletGarzonService implements WalletGarzonUseCase {
    constructor(
        @Inject(WALLET_GARZON_REPOSITORY)
        private readonly walletRepository: WalletGarzonRepository,
    ) { }

    /**
     * Obtiene las wallets de un cliente
     * @param params.identifier - ID numérico ("2260") o número de identificación ("V30853507")
     */
    async getClientWallets(params: GetWalletParams): Promise<ClientWalletResponse> {
        if (!params.identifier || params.identifier.trim() === '') {
            throw new BadRequestException('El identificador del cliente es requerido');
        }

        return this.walletRepository.getClientWallets(params);
    }

    /**
     * Genera token(s) para las wallets especificadas
     * @param params.wallets - Array de wallets con id, moneda y client_id
     */
    async generateToken(params: GenerateWalletTokenParams): Promise<WalletTokenResponse> {
        return this.walletRepository.generateToken(params);
    }
}


