import {
  ClientWalletResponse,
  GetWalletParams,
  GenerateWalletTokenParams,
  WalletTokenResponse,
} from '../../entities/wallet.entity';

export const WALLET_GARZON_USE_CASE = 'WALLET_GARZON_USE_CASE';

/**
 * Puerto de entrada para el caso de uso de Wallets de SuperGarzon.
 * Define el contrato para consultar información de wallets.
 */
export interface WalletGarzonUseCase {
  /**
   * Obtiene las wallets de un cliente
   * @param params - Parámetros con el ID del cliente
   * @returns Información formateada de las wallets
   */
  getClientWallets(params: GetWalletParams): Promise<ClientWalletResponse>;

  /**
   * Genera token(s) para las wallets especificadas
   * @param params - Lista de wallets para generar token
   * @returns Respuesta con el resultado de la generación
   */
  generateToken(
    params: GenerateWalletTokenParams,
  ): Promise<WalletTokenResponse>;
}
