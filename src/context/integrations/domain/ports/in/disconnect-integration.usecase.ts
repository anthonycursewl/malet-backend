/**
 * Injection token for DisconnectIntegrationUseCase
 */
export const DISCONNECT_INTEGRATION_USE_CASE =
  'DISCONNECT_INTEGRATION_USE_CASE';

/**
 * Command to disconnect an integration
 */
export interface DisconnectIntegrationCommand {
  userId: string;
  provider: string;
  revokeTokens?: boolean;
}

/**
 * Result of disconnecting an integration
 */
export interface DisconnectIntegrationResult {
  success: boolean;
  provider: string;
  tokensRevoked: boolean;
  message: string;
}

/**
 * DisconnectIntegration Use Case (Input/Driving Port)
 *
 * Handles disconnecting a user from an external provider.
 * Can optionally revoke tokens at the provider level.
 *
 * This is a "driving" port - external actors (controllers) use this interface.
 */
export interface DisconnectIntegrationUseCase {
  /**
   * Execute the disconnect flow
   *
   * @param command - The disconnect command
   * @returns The result of the disconnection
   */
  execute(
    command: DisconnectIntegrationCommand,
  ): Promise<DisconnectIntegrationResult>;
}
