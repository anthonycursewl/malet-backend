import { WebAuthSession } from '../../entities/web-auth-session.entity';

export const WEB_AUTH_SESSION_REPOSITORY = 'WEB_AUTH_SESSION_REPOSITORY';

export interface WebAuthSessionRepository {
    save(session: WebAuthSession): Promise<void>;
    findById(id: string): Promise<WebAuthSession | null>;
    findByQrCode(qrCode: string): Promise<WebAuthSession | null>;
    findBySessionToken(token: string): Promise<WebAuthSession | null>;
    update(session: WebAuthSession): Promise<void>;
}
