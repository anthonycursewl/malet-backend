import { LinkedAccount } from '../../entities';

/**
 * Injection token for LinkedAccountRepositoryPort
 */
export const LINKED_ACCOUNT_REPOSITORY_PORT = 'LINKED_ACCOUNT_REPOSITORY_PORT';

/**
 * Data required to create or update a linked account
 */
export interface UpsertLinkedAccountData {
  id?: string;
  userId: string;
  provider: string;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes: string[];
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}

/**
 * LinkedAccountRepository Port (Output/Driven)
 *
 * Defines the contract for persisting and retrieving linked accounts.
 *
 * This is a "driven" port - the domain uses it to persist data.
 */
export abstract class LinkedAccountRepositoryPort {
  /**
   * Find a linked account by user ID and provider
   *
   * @param userId - The Malet user ID
   * @param provider - The provider identifier
   * @returns The linked account if found
   */
  abstract findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<LinkedAccount | null>;

  /**
   * Find all linked accounts for a user
   *
   * @param userId - The Malet user ID
   * @returns Array of linked accounts
   */
  abstract findAllByUser(userId: string): Promise<LinkedAccount[]>;

  /**
   * Find a linked account by provider user ID
   *
   * @param provider - The provider identifier
   * @param providerUserId - The user ID in the external system
   * @returns The linked account if found
   */
  abstract findByProviderUserId(
    provider: string,
    providerUserId: string,
  ): Promise<LinkedAccount | null>;

  /**
   * Create or update a linked account
   *
   * @param data - The data to create/update
   * @returns The created/updated linked account
   */
  abstract upsert(data: UpsertLinkedAccountData): Promise<LinkedAccount>;

  /**
   * Update tokens for a linked account
   *
   * @param userId - The Malet user ID
   * @param provider - The provider identifier
   * @param accessToken - The new encrypted access token
   * @param refreshToken - The new encrypted refresh token (optional)
   * @param expiresAt - The new expiration date
   * @returns The updated linked account
   */
  abstract updateTokens(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): Promise<LinkedAccount>;

  /**
   * Deactivate a linked account (soft delete)
   *
   * @param userId - The Malet user ID
   * @param provider - The provider identifier
   */
  abstract deactivate(userId: string, provider: string): Promise<void>;

  /**
   * Permanently delete a linked account
   *
   * @param userId - The Malet user ID
   * @param provider - The provider identifier
   */
  abstract delete(userId: string, provider: string): Promise<void>;

  /**
   * Find accounts with expiring tokens
   *
   * @param withinMinutes - Find tokens expiring within this many minutes
   * @returns Array of linked accounts with expiring tokens
   */
  abstract findExpiringTokens(withinMinutes: number): Promise<LinkedAccount[]>;
}
