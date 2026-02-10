import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  VerifyEmailUseCase,
  VerifyEmailParams,
  VerifyEmailResult,
} from '../domain/ports/in/verify-email.usecase';
import {
  USER_REPOSITORY_PORT,
  UserRepository,
} from '../domain/ports/out/user.repository';
import {
  TOKEN_REPOSITORY_PORT,
  TokenRepository,
} from '../domain/ports/out/token.repository';
import {
  EMAIL_SERVICE_PORT,
  EmailServicePort,
} from 'src/shared/infrastructure/email/email-service.port';

/**
 * Servicio para verificar el email de un usuario.
 * Valida el código de verificación y marca el email como verificado.
 */
@Injectable()
export class VerifyEmailService implements VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepository,
    @Inject(TOKEN_REPOSITORY_PORT)
    private readonly tokenRepository: TokenRepository,
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
  ) {}

  async execute(params: VerifyEmailParams): Promise<VerifyEmailResult> {
    // Buscar usuario por email
    const user = await this.userRepository.findByEmail(params.email);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya está verificado
    if (user.isEmailVerified()) {
      return {
        verified: true,
        message: 'El email ya está verificado',
      };
    }

    // Buscar token válido
    const token = await this.tokenRepository.findByUserIdAndToken(
      user.getId(),
      params.token,
    );

    if (!token) {
      throw new BadRequestException('Código de verificación inválido');
    }

    if (token.isExpired()) {
      // Limpiar token expirado
      await this.tokenRepository.deleteByUserId(user.getId());
      throw new BadRequestException(
        'El código ha expirado. Solicita uno nuevo.',
      );
    }

    // Verificar el email del usuario
    await this.userRepository.verifyEmail(user.getId());

    // Eliminar todos los tokens usados
    await this.tokenRepository.deleteByUserId(user.getId());

    // Enviar email de bienvenida
    await this.emailService.sendWelcomeEmail({
      to: user.getEmail(),
      username: user.getUsername(),
    });

    return {
      verified: true,
      message: 'Email verificado exitosamente',
    };
  }
}
