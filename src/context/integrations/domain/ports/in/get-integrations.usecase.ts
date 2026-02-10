import { LinkedAccount } from '../../entities';

/**
 * Injection token for GetIntegrationsUseCase
 */
export const GET_INTEGRATIONS_USE_CASE = 'GET_INTEGRATIONS_USE_CASE';

/**
 * Query to get integrations
 */
export interface GetIntegrationsQuery {
  userId: string;
  provider?: string;
  activeOnly?: boolean;
}

/**
 * Integration info for display
 */
export interface IntegrationInfo {
  provider: string;
  displayName: string;
  providerUserId: string;
  isActive: boolean;
  isTokenExpired: boolean;
  scopes: string[];
  connectedAt: Date;
  lastSyncAt: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Available provider info
 */
export interface AvailableProvider {
  provider: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  isConnected: boolean;
  supportsProvisioning: boolean;
}

/**
 * GetIntegrations Use Case (Input/Driving Port)
 *
 * Retrieves integrations for a user, including both connected
 * and available providers.
 *
 * This is a "driving" port - external actors (controllers) use this interface.
 */
export interface GetIntegrationsUseCase {
  /**
   * Get all integrations for a user
   *
   * @param query - The query parameters
   * @returns Array of integration info
   */
  execute(query: GetIntegrationsQuery): Promise<IntegrationInfo[]>;

  /**
   * Get a specific integration
   *
   * @param userId - The user ID
   * @param provider - The provider identifier
   * @returns The linked account or null
   */
  getByProvider(
    userId: string,
    provider: string,
  ): Promise<LinkedAccount | null>;

  /**
   * Get all available providers with connection status
   *
   * @param userId - The user ID to check connections
   * @returns Array of available providers
   */
  getAvailableProviders(userId: string): Promise<AvailableProvider[]>;
}
