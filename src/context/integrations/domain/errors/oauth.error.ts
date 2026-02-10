import { IntegrationError } from './integration.error';

/**
 * OAuth Error
 *
 * Thrown when there's an error during the OAuth flow.
 */
export class OAuthError extends IntegrationError {
  public readonly provider: string;
  public readonly oauthErrorCode?: string;

  constructor(provider: string, message: string, oauthErrorCode?: string) {
    super(`OAuth error with ${provider}: ${message}`, 'OAUTH_ERROR', 401);
    this.provider = provider;
    this.oauthErrorCode = oauthErrorCode;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      oauthErrorCode: this.oauthErrorCode,
    };
  }
}

/**
 * Invalid State Error
 *
 * Thrown when the OAuth state token is invalid or expired.
 */
export class InvalidStateError extends IntegrationError {
  public readonly provider: string;

  constructor(provider: string) {
    super(
      `Invalid or expired OAuth state for ${provider}`,
      'INVALID_STATE',
      400,
    );
    this.provider = provider;
  }
}

/**
 * Token Expired Error
 *
 * Thrown when access token has expired and refresh is not possible.
 */
export class TokenExpiredError extends IntegrationError {
  public readonly provider: string;
  public readonly canRefresh: boolean;

  constructor(provider: string, canRefresh: boolean = false) {
    super(
      `Access token expired for ${provider}${canRefresh ? ' - refresh available' : ''}`,
      'TOKEN_EXPIRED',
      401,
    );
    this.provider = provider;
    this.canRefresh = canRefresh;
  }
}
