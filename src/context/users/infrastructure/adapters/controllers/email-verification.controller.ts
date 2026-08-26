import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  VERIFY_EMAIL_USECASE,
  VerifyEmailUseCase,
  VerifyEmailParams,
} from 'src/context/users/domain/ports/in/verify-email.usecase';
import {
  RESEND_VERIFICATION_USECASE,
  ResendVerificationUseCase,
  ResendVerificationParams,
} from 'src/context/users/domain/ports/in/resend-verification.usecase';

/**
 * Controlador para operaciones de verificación de email.
 * Todos los endpoints son públicos (no requieren autenticación).
 */
@Controller('email')
export class EmailVerificationController {
  constructor(
    @Inject(VERIFY_EMAIL_USECASE)
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    @Inject(RESEND_VERIFICATION_USECASE)
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
  ) {}

  /**
   * Verifica el email de un usuario con el código de verificación.
   * Limitado a 5 intentos por minuto por IP.
   */
  @Post('verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() params: VerifyEmailParams) {
    return this.verifyEmailUseCase.execute(params);
  }

  /**
   * Reenvía el código de verificación al email del usuario.
   * Limitado a 1 reenvío cada 60 segundos.
   */
  @Post('resend-verification')
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() params: ResendVerificationParams) {
    return this.resendVerificationUseCase.execute(params);
  }
}
