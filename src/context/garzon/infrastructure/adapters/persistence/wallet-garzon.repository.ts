import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  ClientWallet,
  ClientWalletApiResponse,
  ClientWalletResponse,
  GetWalletParams,
  WalletInfo,
  GenerateWalletTokenParams,
  WalletTokenResponse,
  WalletTokenApiResponse,
} from 'src/context/garzon/domain/entities/wallet.entity';
import { WalletGarzonRepository } from 'src/context/garzon/domain/ports/out/wallet-garzon.repository';

/**
 * Adaptador de infraestructura para consumir la API de Wallets de SuperGarzon.
 * Hace las peticiones HTTP reales a la API externa.
 *
 * Soporta búsqueda por:
 * - ID numérico del cliente: "2260"
 * - Número de identificación (cédula): "V30853507"
 */
@Injectable()
export class SuperGarzonWalletAdapter implements WalletGarzonRepository {
  private readonly apiBaseUrl = 'https://api.supergarzon.com/api';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtiene las wallets de un cliente desde la API de SuperGarzon
   * @param params.identifier - Puede ser ID numérico o número de identificación
   */
  async getClientWallets(
    params: GetWalletParams,
  ): Promise<ClientWalletResponse> {
    try {
      console.log(
        `[WalletAdapter] Fetching wallets for identifier: ${params.identifier}`,
      );

      const url = `${this.apiBaseUrl}/clientwallet/${params.identifier}`;

      const response = await lastValueFrom(
        this.httpService.get<ClientWalletApiResponse>(url, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
      );

      const apiResponse = response.data;

      if (
        apiResponse.code !== 200 ||
        !apiResponse.data ||
        apiResponse.data.length === 0
      ) {
        throw new NotFoundException(
          `No se encontraron wallets para el cliente ${params.identifier}`,
        );
      }

      // Transformar la respuesta de la API a nuestro formato
      return this.transformResponse(apiResponse.data);
    } catch (error: any) {
      console.error(
        '[WalletAdapter] Error fetching wallets:',
        error?.message || error,
      );

      if (error?.response?.status === 404) {
        throw new NotFoundException(
          `Cliente ${params.identifier} no encontrado`,
        );
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error al consultar las wallets del cliente',
      );
    }
  }

  /**
   * Genera token(s) para las wallets especificadas
   * POST https://api.supergarzon.com/api/wallet/token
   */
  async generateToken(
    params: GenerateWalletTokenParams,
  ): Promise<WalletTokenResponse> {
    try {
      console.log(
        `[WalletAdapter] Generating token for ${params.wallets.length} wallet(s)`,
      );

      const url = `${this.apiBaseUrl}/wallet/token`;

      const response = await lastValueFrom(
        this.httpService.post<WalletTokenApiResponse>(url, params, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Origin: 'https://webwallet.supergarzon.com',
            Referer: 'https://webwallet.supergarzon.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          },
        }),
      );

      const apiResponse = response.data;

      console.log(`[WalletAdapter] Token generation response:`, apiResponse);

      return {
        success: apiResponse.code === 200,
        message:
          apiResponse.message ||
          (apiResponse.code === 200
            ? 'Token generado exitosamente'
            : 'Error al generar token'),
        data: apiResponse.data,
        requestedWallets: params.wallets.length,
      };
    } catch (error: any) {
      console.error(
        '[WalletAdapter] Error generating token:',
        error?.message || error,
      );

      throw new InternalServerErrorException(
        'Error al generar token para las wallets',
      );
    }
  }

  /**
   * Transforma la respuesta de la API al formato de nuestro dominio
   */
  private transformResponse(data: ClientWallet[]): ClientWalletResponse {
    // Obtener información del cliente (del primer registro)
    const firstWallet = data[0];

    // Transformar cada wallet
    const wallets: WalletInfo[] = data.map((w) => ({
      walletId: w.wallet_id,
      moneda: w.moneda,
      currency: w.descripcion,
      currencyCode: w.iso,
      balance: w.monto,
      pending: w.pending,
      available: w.monto + w.pending, // Balance disponible real
      lastUpdate: w.updated_at,
      status: w.status === 1 ? ('active' as const) : ('inactive' as const),
      hasToken: w.token !== null,
    }));

    // Crear resumen
    const activeWallets = wallets.filter((w) => w.status === 'active');
    const currencies = [...new Set(wallets.map((w) => w.currencyCode))];

    return {
      client: {
        id: firstWallet.client_id,
        idNumber: firstWallet.id_number,
        name: firstWallet.name.trim(),
        mobile: firstWallet.mobile,
        email: firstWallet.email,
      },
      wallets,
      summary: {
        totalWallets: wallets.length,
        activeWallets: activeWallets.length,
        currencies,
      },
    };
  }
}
