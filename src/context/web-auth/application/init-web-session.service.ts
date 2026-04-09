
import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { WebAuthSession } from '../domain/entities/web-auth-session.entity';
import { InitWebSessionResponse, InitWebSessionUseCase } from '../domain/ports/in/init-web-session.usecase';
import { WEB_AUTH_SESSION_REPOSITORY, WebAuthSessionRepository } from '../domain/ports/out/web-auth-session.repository';

@Injectable()
export class InitWebSessionService implements InitWebSessionUseCase {
    constructor(
        @Inject(WEB_AUTH_SESSION_REPOSITORY)
        private readonly repository: WebAuthSessionRepository,
    ) { }

    async execute(ip: string | null, userAgent: string | null): Promise<InitWebSessionResponse> {
        const id = uuidv4();
        const sessionToken = uuidv4(); // Secret for the web browser
        const qrCode = uuidv4();       // Public ID for the QR

        // In a real scenario, location could be resolved here via IP
        const location = 'Unknown';

        const session = WebAuthSession.create(
            id,
            sessionToken,
            qrCode,
            ip,
            userAgent,
            location
        );

        await this.repository.save(session);

        return {
            sessionId: session.getId(),
            sessionToken: session.getSessionToken(),
            qrCode: session.getQrCode(),
            expiresAt: session.getExpiresAt(),
        };
    }
}
