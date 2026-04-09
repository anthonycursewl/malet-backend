
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthorizeWebSessionUseCase } from '../domain/ports/in/authorize-web-session.usecase';
import { WEB_AUTH_SESSION_REPOSITORY, WebAuthSessionRepository } from '../domain/ports/out/web-auth-session.repository';

@Injectable()
export class AuthorizeWebSessionService implements AuthorizeWebSessionUseCase {
    constructor(
        @Inject(WEB_AUTH_SESSION_REPOSITORY)
        private readonly repository: WebAuthSessionRepository,
    ) { }

    async execute(qrCode: string, userId: string): Promise<void> {
        const session = await this.repository.findByQrCode(qrCode);

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.isExpired()) {
            throw new BadRequestException('Session has expired');
        }

        if (session.getStatus() !== 'pending') {
            throw new BadRequestException(`Session is already ${session.getStatus()}`);
        }

        session.authorize(userId);
        await this.repository.update(session);
    }
}
