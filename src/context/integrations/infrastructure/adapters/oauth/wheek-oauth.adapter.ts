import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationProviderPort,
  IntegrationToken,
  ProviderUserInfo,
  OAuthError,
} from '../../../domain';

/**
 * Wheek OAuth Adapter
 *
 * Implements IntegrationProviderPort for Wheek OAuth integration.
 * Handles authorization, token exchange, and user info retrieval.
 */
@Injectable()
export class WheekOAuthAdapter extends IntegrationProviderPort {
  private readonly logger = new Logger(WheekOAuthAdapter.name);

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  readonly providerId = 'wheek';
  readonly displayName = 'Wheek';
  readonly supportsProvisioning = true;

  constructor(private readonly configService: ConfigService) {
    super();

    this.baseUrl = this.configService.getOrThrow('WHEEK_BASE_URL');
    this.clientId = this.configService.getOrThrow('WHEEK_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow('WHEEK_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow('WHEEK_CALLBACK_URL');
  }

  getAuthorizationUrl(
    state: string,
    scopes: string[],
    codeChallenge?: string,
  ): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state,
    });

    // Add PKCE if code challenge provided
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<IntegrationToken> {
    this.logger.debug('Exchanging authorization code for tokens');

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code: code,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error(`Token exchange failed: ${JSON.stringify(error)}`);
      throw new OAuthError(
        this.providerId,
        error.error_description || 'Failed to exchange code for tokens',
        error.error,
      );
    }

    const data = await response.json();

    return IntegrationToken.fromOAuthResponse({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
      token_type: data.token_type,
      scope: data.scope || this.getDefaultScopes().join(' '),
    });
  }

  async refreshTokens(refreshToken: string): Promise<IntegrationToken> {
    this.logger.debug('Refreshing access token');

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new OAuthError(
        this.providerId,
        error.error_description || 'Failed to refresh token',
        error.error,
      );
    }

    const data = await response.json();

    return IntegrationToken.fromOAuthResponse({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in || 3600,
      token_type: data.token_type,
      scope: data.scope,
    });
  }

  async getUserInfo(accessToken: string): Promise<ProviderUserInfo> {
    this.logger.debug('Fetching user info from Wheek');

    const response = await fetch(`${this.baseUrl}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new OAuthError(
        this.providerId,
        error.message || 'Failed to get user info',
        response.status.toString(),
      );
    }

    const data = await response.json();

    return {
      providerUserId: data.id || data.user_id,
      email: data.email,
      name: data.name || data.display_name,
      avatarUrl: data.avatar_url || data.profile_image,
      emailVerified: data.email_verified ?? false,
      metadata: {
        username: data.username,
        created_at: data.created_at,
        subscription: data.subscription,
      },
    };
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    this.logger.debug('Revoking access token');

    try {
      const response = await fetch(`${this.baseUrl}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: accessToken,
        }).toString(),
      });

      return response.ok;
    } catch (error) {
      this.logger.warn(`Token revocation failed: ${error.message}`);
      return false;
    }
  }

  getDefaultScopes(): string[] {
    return ['profile', 'email', 'read:orders', 'write:orders'];
  }
}
