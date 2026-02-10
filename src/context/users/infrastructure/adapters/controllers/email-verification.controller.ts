import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Inject } from '@nestjs/common';
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
   *
   * @param params - Email y código de 6 dígitos
   * @returns Resultado de la verificación
   *
   * @example
   * POST /email/verify
   * { "email": "user@example.com", "token": "123456" }
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() params: VerifyEmailParams) {
    return this.verifyEmailUseCase.execute(params);
  }

  /**
   * Reenvía el código de verificación al email del usuario.
   * Tiene rate limiting de 60 segundos entre reenvíos.
   *
   * @param params - Email del usuario
   * @returns Confirmación del envío
   *
   * @example
   * POST /email/resend-verification
   * { "email": "user@example.com" }
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() params: ResendVerificationParams) {
    return this.resendVerificationUseCase.execute(params);
  }
}
