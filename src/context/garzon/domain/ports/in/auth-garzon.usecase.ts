import { AuthCredentials, AuthSession } from "../../entities/auth.entity";

export const AUTH_GARZON_USE_CASE = 'AUTH_GARZON_USE_CASE';

/**
 * Input port for Garzon authentication use case.
 * This interface defines the contract for authenticating users against the Garzon system.
 */
export interface AuthGarzonUseCase {
    /**
     * Executes the authentication flow with the given credentials.
     * @param credentials - The user's authentication credentials
     * @returns A promise that resolves to the authenticated session
     */
    execute(credentials: AuthCredentials): Promise<AuthSession>;
}
