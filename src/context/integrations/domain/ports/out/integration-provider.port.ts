import { IntegrationToken } from '../../entities';

/**
 * Injection token for IntegrationProviderPort
 */
export const INTEGRATION_PROVIDER_PORT = 'INTEGRATION_PROVIDER_PORT';

/**
 * User information returned by the provider
 */
export interface ProviderUserInfo {
  providerUserId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

/**
 * IntegrationProvider Port (Output/Driven)
 *
 * Defines the contract for OAuth integration with external providers.
 * Each provider (Wheek, Google, etc.) implements this interface.
 *
 * This is a "driven" port - the domain uses it to interact with external systems.
 */
export abstract class IntegrationProviderPort {
  /**
   * Get the provider identifier
   */
  abstract readonly providerId: string;

  /**
   * Get the provider display name
   */
  abstract readonly displayName: string;

  /**
   * Check if the provider supports user provisioning
   */
  abstract readonly supportsProvisioning: boolean;

  /**
   * Generate the OAuth authorization URL
   *
   * @param state - The state token for CSRF protection
   * @param scopes - The scopes to request
   * @param codeChallenge - Optional PKCE code challenge
   * @returns The full authorization URL
   */
  abstract getAuthorizationUrl(
    state: string,
    scopes: string[],
    codeChallenge?: string,
  ): string;

  /**
   * Exchange an authorization code for tokens
   *
   * @param code - The authorization code from the callback
   * @param codeVerifier - Optional PKCE code verifier
   * @returns The tokens from the provider
   */
  abstract exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<IntegrationToken>;

  /**
   * Refresh an expired access token
   *
   * @param refreshToken - The refresh token
   * @returns New tokens from the provider
   */
  abstract refreshTokens(refreshToken: string): Promise<IntegrationToken>;

  /**
   * Get user information from the provider
   *
   * @param accessToken - A valid access token
   * @returns User information from the provider
   */
  abstract getUserInfo(accessToken: string): Promise<ProviderUserInfo>;

  /**
   * Revoke tokens (logout from provider)
   *
   * @param accessToken - The access token to revoke
   * @returns True if successfully revoked
   */
  abstract revokeToken(accessToken: string): Promise<boolean>;

  /**
   * Get the default scopes for this provider
   */
  abstract getDefaultScopes(): string[];
}
