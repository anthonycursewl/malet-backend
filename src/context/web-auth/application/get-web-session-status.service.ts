import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetWebSessionStatusUseCase, WebSessionStatusResponse } from '../domain/ports/in/get-web-session-status.usecase';
import { WEB_AUTH_SESSION_REPOSITORY, WebAuthSessionRepository } from '../domain/ports/out/web-auth-session.repository';
import { AuthService } from 'src/shared/infrastructure/services/auth.service';
import { USER_REPOSITORY_PORT, UserRepository } from 'src/context/users/domain/ports/out/user.repository';

@Injectable()
export class GetWebSessionStatusService implements GetWebSessionStatusUseCase {
    constructor(
        @Inject(WEB_AUTH_SESSION_REPOSITORY)
        private readonly repository: WebAuthSessionRepository,
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository,
        private readonly authService: AuthService,
    ) { }

    async execute(sessionToken: string): Promise<WebSessionStatusResponse> {
        const session = await this.repository.findBySessionToken(sessionToken);

        if (!session) {
            throw new NotFoundException('Session session not found');
        }

        if (session.isExpired()) {
            return {
                status: 'expired',
                expiresAt: session.getExpiresAt(),
            };
        }

        if (session.getStatus() === 'authorized') {
            const userId = session.getUserId();
            if (!userId) {
                throw new Error('Inconsistent state: session authorized without user ID');
            }

            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new UnauthorizedException('User no longer exists');
            }

            // Generate Malet access tokens
            const { access_token } = await this.authService.generateToken(user);

            // Mark session as consumed to avoid reuse
            session.consume();
            await this.repository.update(session);

            return {
                status: 'completed',
                accessToken: access_token,
                expiresAt: session.getExpiresAt(),
            };
        }

        return {
            status: session.getStatus(),
            expiresAt: session.getExpiresAt(),
        };
    }
}
