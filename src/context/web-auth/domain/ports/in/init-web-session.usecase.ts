
export const INIT_WEB_SESSION_USE_CASE = 'INIT_WEB_SESSION_USE_CASE';

export interface InitWebSessionResponse {
    sessionId: string;
    sessionToken: string;
    qrCode: string;
    expiresAt: Date;
}

export interface InitWebSessionUseCase {
    execute(ip: string | null, userAgent: string | null): Promise<InitWebSessionResponse>;
}
