import { Inject, Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import {
    ResendVerificationUseCase,
    ResendVerificationParams,
    ResendVerificationResult
} from "../domain/ports/in/resend-verification.usecase";
import { USER_REPOSITORY_PORT, UserRepository } from "../domain/ports/out/user.repository";
import { TOKEN_REPOSITORY_PORT, TokenRepository } from "../domain/ports/out/token.repository";
import { EMAIL_SERVICE_PORT, EmailServicePort } from "src/shared/infrastructure/email/email-service.port";
import { EmailVerificationToken } from "../domain/entities/email-verification-token.entity";

/**
 * Servicio para reenviar el código de verificación.
 * Implementa rate limiting para evitar spam.
 */
@Injectable()
export class ResendVerificationService implements ResendVerificationUseCase {
    /** Tiempo mínimo entre reenvíos en segundos */
    private static readonly RATE_LIMIT_SECONDS = 60;

    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository,
        @Inject(TOKEN_REPOSITORY_PORT)
        private readonly tokenRepository: TokenRepository,
        @Inject(EMAIL_SERVICE_PORT)
        private readonly emailService: EmailServicePort
    ) { }

    async execute(params: ResendVerificationParams): Promise<ResendVerificationResult> {
        // Buscar usuario por email
        const user = await this.userRepository.findByEmail(params.email);

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        // Verificar si ya está verificado
        if (user.isEmailVerified()) {
            return {
                sent: false,
                message: 'El email ya está verificado'
            };
        }

        // Verificar rate limiting (último token hace menos de 60 segundos)
        const latestToken = await this.tokenRepository.findLatestByUserId(user.getId());

        if (latestToken) {
            const rateLimitMs = ResendVerificationService.RATE_LIMIT_SECONDS * 1000;
            const timeSinceLastToken = Date.now() - latestToken.getCreatedAt().getTime();

            if (timeSinceLastToken < rateLimitMs) {
                const secondsRemaining = Math.ceil((rateLimitMs - timeSinceLastToken) / 1000);
                throw new BadRequestException(
                    `Espera ${secondsRemaining} segundos antes de solicitar otro código`
                );
            }
        }

        // Eliminar tokens anteriores
        await this.tokenRepository.deleteByUserId(user.getId());

        // Crear nuevo token
        const newToken = EmailVerificationToken.create(user.getId());
        await this.tokenRepository.save(newToken);

        // Enviar email de verificación
        const emailResult = await this.emailService.sendVerificationEmail({
            to: user.getEmail(),
            username: user.getUsername(),
            verificationCode: newToken.getToken()
        });

        if (!emailResult.success) {
            throw new BadRequestException('Error al enviar el email. Intenta de nuevo.');
        }

        return {
            sent: true,
            message: 'Código de verificación enviado'
        };
    }
}
