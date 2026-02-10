import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  WALLET_GARZON_USE_CASE,
  WalletGarzonUseCase,
} from '../../../domain/ports/in/wallet-garzon.usecase';
import {
  ClientWalletResponse,
  WalletTokenResponse,
  WalletTokenRequest,
} from '../../../domain/entities/wallet.entity';

/**
 * Controller para el sistema de Wallets de SuperGarzon.
 *
 * Expone endpoints para consultar información de wallets de clientes.
 *
 * ⚠️ REQUIERE AUTENTICACIÓN JWT
 * Header: Authorization: Bearer <token>
 *
 * Endpoints disponibles:
 * - GET /garzon/wallet/:identifier - Obtiene las wallets de un cliente
 * - POST /garzon/wallet/token - Genera token(s) para wallet(s)
 */
@Controller('garzon/wallet')
@UseGuards(JwtAuthGuard)
export class WalletGarzonController {
  constructor(
    @Inject(WALLET_GARZON_USE_CASE)
    private readonly walletUseCase: WalletGarzonUseCase,
  ) {}

  /**
   * Genera token(s) para las wallets especificadas
   *
   * POST /garzon/wallet/token
   *
   * Headers requeridos:
   * - Authorization: Bearer <jwt_token>
   *
   * @param body - Array de wallets para generar token
   * @returns Resultado de la generación de tokens
   *
   * @example
   * POST /garzon/wallet/token
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   *
   * Body (array directo):
   * [
   *   { "id": 6578, "moneda": 15, "client_id": 2267 }
   * ]
   *
   * Response:
   * {
   *   "success": true,
   *   "message": "Token generado exitosamente",
   *   "data": { ... },
   *   "requestedWallets": 1
   * }
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async generateToken(
    @Body() wallets: WalletTokenRequest[],
  ): Promise<WalletTokenResponse> {
    return this.walletUseCase.generateToken({ wallets });
  }

  /**
   * Obtiene las wallets de un cliente por su identificador
   *
   * GET /garzon/wallet/:identifier
   *
   * El identifier puede ser:
   * - ID numérico del cliente: "2260"
   * - Número de identificación (cédula): "V30853507"
   *
   * Headers requeridos:
   * - Authorization: Bearer <jwt_token>
   *
   * @param identifier - ID o número de identificación del cliente
   * @returns Información completa de las wallets del cliente
   *
   * @example
   * GET /garzon/wallet/2260
   * GET /garzon/wallet/V30853507
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   *
   * Response:
   * {
   *   "client": {
   *     "id": 2260,
   *     "idNumber": "V30853507",
   *     "name": "Diego Zerpa",
   *     "mobile": "04261792418",
   *     "email": "alexzerzerpa@gmail.com"
   *   },
   *   "wallets": [
   *     {
   *       "walletId": 6550,
   *       "currency": "TRANSFERENCIA",
   *       "currencyCode": "BS",
   *       "balance": 5.4,
   *       "pending": 0,
   *       "available": 5.4,
   *       "lastUpdate": "2025-12-01T00:25:00.000Z",
   *       "status": "active",
   *       "hasToken": true
   *     }
   *   ],
   *   "summary": {
   *     "totalWallets": 4,
   *     "activeWallets": 4,
   *     "currencies": ["COP", "USD", "BS", "PTG"]
   *   }
   * }
   */
  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  async getClientWallets(
    @Param('identifier') identifier: string,
  ): Promise<ClientWalletResponse> {
    return this.walletUseCase.getClientWallets({ identifier });
  }
}
