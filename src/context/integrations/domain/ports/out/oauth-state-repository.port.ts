import { OAuthState } from '../../value-objects';

/**
 * Injection token for OAuthStateRepositoryPort
 */
export const OAUTH_STATE_REPOSITORY_PORT = 'OAUTH_STATE_REPOSITORY_PORT';

/**
 * OAuthStateRepository Port (Output/Driven)
 *
 * Defines the contract for storing and retrieving OAuth state tokens.
 * State tokens are temporary and used to validate OAuth callbacks.
 *
 * This is a "driven" port - the domain uses it to persist OAuth state.
 */
export abstract class OAuthStateRepositoryPort {
  /**
   * Save a new OAuth state
   *
   * @param id - Unique identifier for the state record
   * @param state - The OAuth state to save
   */
  abstract save(id: string, state: OAuthState): Promise<void>;

  /**
   * Find and validate an OAuth state by token
   *
   * @param stateToken - The state token from the callback
   * @returns The OAuth state if valid and not expired
   */
  abstract findByToken(stateToken: string): Promise<OAuthState | null>;

  /**
   * Delete a used OAuth state
   *
   * @param stateToken - The state token to delete
   */
  abstract delete(stateToken: string): Promise<void>;

  /**
   * Delete all expired OAuth states (cleanup)
   *
   * @returns Number of deleted records
   */
  abstract deleteExpired(): Promise<number>;

  /**
   * Find OAuth state by user and provider
   *
   * @param userId - The user ID
   * @param provider - The provider identifier
   * @returns The most recent OAuth state
   */
  abstract findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<OAuthState | null>;
}
