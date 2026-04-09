
export const GET_WEB_SESSION_STATUS_USE_CASE = 'GET_WEB_SESSION_STATUS_USE_CASE';

export interface WebSessionStatusResponse {
    status: string;
    accessToken?: string;
    expiresAt: Date;
}

export interface GetWebSessionStatusUseCase {
    execute(sessionToken: string): Promise<WebSessionStatusResponse>;
}
