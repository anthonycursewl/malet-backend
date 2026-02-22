export interface GoogleUser {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
}

export interface IGoogleAuthService {
    validateGoogleToken(token: string): Promise<GoogleUser>;
}

export const GOOGLE_AUTH_SERVICE = 'GOOGLE_AUTH_SERVICE';
