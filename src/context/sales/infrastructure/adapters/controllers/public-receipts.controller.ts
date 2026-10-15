import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  RECEIPTS_USECASE,
  ReceiptsUseCase,
} from '../../../domain/ports/in/receipts.usecase';

/**
 * Verificación **pública** de un recibo (sin login): valida la firma HMAC del
 * folio y devuelve solo datos no sensibles. Limitada por rate limit para evitar
 * enumeración de folios.
 */
@Controller('public/receipts')
export class PublicReceiptsController {
  constructor(
    @Inject(RECEIPTS_USECASE)
    private readonly receiptsUseCase: ReceiptsUseCase,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':number')
  async verify(
    @Param('number') number: string,
    @Query('token') token?: string,
  ) {
    return this.receiptsUseCase.verifyPublic(number, token ?? '');
  }
}
