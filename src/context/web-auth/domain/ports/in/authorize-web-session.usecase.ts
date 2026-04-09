
export const AUTHORIZE_WEB_SESSION_USE_CASE = 'AUTHORIZE_WEB_SESSION_USE_CASE';

export interface AuthorizeWebSessionUseCase {
    execute(qrCode: string, userId: string): Promise<void>;
}
