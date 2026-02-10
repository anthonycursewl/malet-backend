import {
  ClientWalletResponse,
  GetWalletParams,
  GenerateWalletTokenParams,
  WalletTokenResponse,
} from '../../entities/wallet.entity';

export const WALLET_GARZON_REPOSITORY = 'WALLET_GARZON_REPOSITORY';

/**
 * Puerto de salida para el repositorio de Wallets de SuperGarzon.
 * Define el contrato para obtener información de wallets desde la API externa.
 */
export abstract class WalletGarzonRepository {
  /**
   * Obtiene las wallets de un cliente por su ID
   * @param params - Parámetros con el ID del cliente
   * @returns Información completa de las wallets del cliente
   */
  abstract getClientWallets(
    params: GetWalletParams,
  ): Promise<ClientWalletResponse>;

  /**
   * Genera token(s) para las wallets especificadas
   * @param params - Lista de wallets para generar token
   * @returns Respuesta con el resultado de la generación
   */
  abstract generateToken(
    params: GenerateWalletTokenParams,
  ): Promise<WalletTokenResponse>;
}
