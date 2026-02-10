/**
 * LinkedAccount Entity
 *
 * Represents a connection between a Malet user and an external provider (e.g., Wheek, Google).
 * Contains encrypted tokens for secure storage.
 */
export class LinkedAccount {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly provider: string,
    public readonly providerUserId: string,
    public readonly accessToken: string,
    public readonly refreshToken: string | null,
    public readonly tokenExpiresAt: Date | null,
    public readonly scopes: string[],
    public readonly metadata: Record<string, unknown> | null,
    public readonly isActive: boolean,
    public readonly lastSyncAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Check if the access token has expired
   */
  isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return false;
    // Add 5 minute buffer to avoid edge cases
    const bufferMs = 5 * 60 * 1000;
    return new Date().getTime() >= this.tokenExpiresAt.getTime() - bufferMs;
  }

  /**
   * Check if the account needs token refresh
   */
  needsRefresh(): boolean {
    return this.isTokenExpired() && !!this.refreshToken;
  }

  /**
   * Check if the account has a specific scope
   */
  hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  /**
   * Create a new LinkedAccount with updated tokens
   */
  withUpdatedTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): LinkedAccount {
    return new LinkedAccount(
      this.id,
      this.userId,
      this.provider,
      this.providerUserId,
      accessToken,
      refreshToken ?? this.refreshToken,
      expiresAt,
      this.scopes,
      this.metadata,
      this.isActive,
      new Date(),
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Deactivate the linked account
   */
  deactivate(): LinkedAccount {
    return new LinkedAccount(
      this.id,
      this.userId,
      this.provider,
      this.providerUserId,
      this.accessToken,
      this.refreshToken,
      this.tokenExpiresAt,
      this.scopes,
      this.metadata,
      false,
      this.lastSyncAt,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Create from database record
   */
  static fromPersistence(data: {
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: Date | null;
    scopes: string[];
    metadata: unknown; // Prisma JsonValue
    is_active: boolean;
    last_sync_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): LinkedAccount {
    // Safely cast metadata from Prisma JsonValue
    const metadata =
      typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as Record<string, unknown>)
        : null;

    return new LinkedAccount(
      data.id,
      data.user_id,
      data.provider,
      data.provider_user_id,
      data.access_token,
      data.refresh_token,
      data.token_expires_at,
      data.scopes,
      metadata,
      data.is_active,
      data.last_sync_at,
      data.created_at,
      data.updated_at,
    );
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      user_id: this.userId,
      provider: this.provider,
      provider_user_id: this.providerUserId,
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      token_expires_at: this.tokenExpiresAt,
      scopes: this.scopes,
      metadata: this.metadata,
      is_active: this.isActive,
      last_sync_at: this.lastSyncAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}
