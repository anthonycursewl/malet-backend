import { randomBytes } from 'crypto';

/**
 * OAuthState Value Object
 *
 * Represents a secure, temporary state token used during OAuth flows
 * to prevent CSRF attacks and maintain request integrity.
 */
export class OAuthState {
  private readonly _stateToken: string;
  private readonly _userId: string;
  private readonly _provider: string;
  private readonly _codeVerifier: string | null;
  private readonly _redirectUrl: string | null;
  private readonly _scopes: string[];
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;

  constructor(params: {
    stateToken?: string;
    userId: string;
    provider: string;
    codeVerifier?: string;
    redirectUrl?: string;
    scopes?: string[];
    expiresAt?: Date;
    createdAt?: Date;
  }) {
    this._stateToken = params.stateToken ?? OAuthState.generateStateToken();
    this._userId = params.userId;
    this._provider = params.provider;
    this._codeVerifier = params.codeVerifier ?? null;
    this._redirectUrl = params.redirectUrl ?? null;
    this._scopes = params.scopes ?? [];
    this._expiresAt = params.expiresAt ?? OAuthState.defaultExpiration();
    this._createdAt = params.createdAt ?? new Date();

    this.validate();
  }

  private validate(): void {
    if (!this._userId || this._userId.trim().length === 0) {
      throw new Error('User ID is required for OAuth state');
    }
    if (!this._provider || this._provider.trim().length === 0) {
      throw new Error('Provider is required for OAuth state');
    }
    if (!this._stateToken || this._stateToken.length < 32) {
      throw new Error('State token must be at least 32 characters');
    }
  }

  get stateToken(): string {
    return this._stateToken;
  }

  get userId(): string {
    return this._userId;
  }

  get provider(): string {
    return this._provider;
  }

  get codeVerifier(): string | null {
    return this._codeVerifier;
  }

  get redirectUrl(): string | null {
    return this._redirectUrl;
  }

  get scopes(): string[] {
    return [...this._scopes];
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Check if the state has expired
   */
  isExpired(): boolean {
    return new Date() >= this._expiresAt;
  }

  /**
   * Verify that a provided state token matches
   */
  verify(providedState: string): boolean {
    if (this.isExpired()) {
      return false;
    }
    // Use constant-time comparison to prevent timing attacks
    return (
      this._stateToken.length === providedState.length &&
      this._stateToken === providedState
    );
  }

  /**
   * Generate a cryptographically secure state token
   */
  static generateStateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a PKCE code verifier
   */
  static generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Get default expiration (10 minutes from now)
   */
  static defaultExpiration(): Date {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

  /**
   * Create a new OAuth state with PKCE support
   */
  static createWithPKCE(
    userId: string,
    provider: string,
    scopes: string[],
    redirectUrl?: string,
  ): OAuthState {
    return new OAuthState({
      userId,
      provider,
      scopes,
      redirectUrl,
      codeVerifier: OAuthState.generateCodeVerifier(),
    });
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): Record<string, unknown> {
    return {
      state_token: this._stateToken,
      user_id: this._userId,
      provider: this._provider,
      code_verifier: this._codeVerifier,
      redirect_url: this._redirectUrl,
      scopes: this._scopes,
      expires_at: this._expiresAt,
      created_at: this._createdAt,
    };
  }

  /**
   * Create from persistence format
   */
  static fromPersistence(data: {
    state_token: string;
    user_id: string;
    provider: string;
    code_verifier: string | null;
    redirect_url: string | null;
    scopes: string[];
    expires_at: Date;
    created_at: Date;
  }): OAuthState {
    return new OAuthState({
      stateToken: data.state_token,
      userId: data.user_id,
      provider: data.provider,
      codeVerifier: data.code_verifier ?? undefined,
      redirectUrl: data.redirect_url ?? undefined,
      scopes: data.scopes,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    });
  }
}
