/**
 * IntegrationToken Entity
 *
 * Represents OAuth tokens received from an external provider.
 * Used during the OAuth flow before being persisted to LinkedAccount.
 */
export class IntegrationToken {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string | null,
    public readonly expiresIn: number, // seconds
    public readonly tokenType: string,
    public readonly scope: string,
    public readonly createdAt: Date = new Date(),
  ) {}

  /**
   * Calculate the expiration date based on expiresIn
   */
  get expiresAt(): Date {
    return new Date(this.createdAt.getTime() + this.expiresIn * 1000);
  }

  /**
   * Get scopes as an array
   */
  get scopesArray(): string[] {
    return this.scope.split(' ').filter(Boolean);
  }

  /**
   * Check if the token has a specific scope
   */
  hasScope(scope: string): boolean {
    return this.scopesArray.includes(scope);
  }

  /**
   * Check if the token is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  /**
   * Create from OAuth provider response
   */
  static fromOAuthResponse(response: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
  }): IntegrationToken {
    return new IntegrationToken(
      response.access_token,
      response.refresh_token ?? null,
      response.expires_in,
      response.token_type ?? 'Bearer',
      response.scope ?? '',
    );
  }
}
