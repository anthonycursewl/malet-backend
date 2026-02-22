import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateUserUseCase } from '../domain/ports/in/create-user.usecase';
import { User } from '../domain/entities/user.entity';
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
import { UserPrimitives } from '../domain/entities/user.entity';
import { EmailVerificationToken } from '../domain/entities/email-verification-token.entity';

/**
 * Servicio para crear nuevos usuarios.
 * Además de crear el usuario, genera un token de verificación
 * y envía un email para verificar la cuenta.
 */
@Injectable()
export class CreateUserService implements CreateUserUseCase {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepository,
    @Inject(TOKEN_REPOSITORY_PORT)
    private readonly tokenRepository: TokenRepository,
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
  ) { }

  async execute(
    user: Omit<UserPrimitives, 'id' | 'created_at'> & { password: string },
  ): Promise<User> {
    // Crear el usuario
    const created = await User.create(user);
    const savedUser = await this.userRepository.save(created);

    // Generar token de verificación
    const verificationToken = EmailVerificationToken.create(savedUser.getId());
    await this.tokenRepository.save(verificationToken);

    // Enviar email de verificación (no bloqueamos si falla)
    try {
      const result = await this.emailService.sendVerificationEmail({
        to: savedUser.getEmail(),
        username: savedUser.getUsername(),
        verificationCode: verificationToken.getToken(),
      });

      if (result.success) {
        this.logger.log(
          `📧 Verification email sent to ${savedUser.getEmail()}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Failed to send verification email: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error sending verification email: ${error.message}`,
      );
      // No lanzamos error para no bloquear el registro
    }

    return savedUser;
  }
}
