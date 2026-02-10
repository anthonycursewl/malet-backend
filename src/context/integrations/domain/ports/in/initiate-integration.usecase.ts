/**
 * Injection token for InitiateIntegrationUseCase
 */
export const INITIATE_INTEGRATION_USE_CASE = 'INITIATE_INTEGRATION_USE_CASE';

/**
 * Command to initiate an integration
 */
export interface InitiateIntegrationCommand {
  userId: string;
  provider: string;
  scopes?: string[];
  redirectUrl?: string;
}

/**
 * Result of initiating an integration
 */
export interface InitiateIntegrationResult {
  authorizationUrl: string;
  stateToken: string;
  expiresAt: Date;
}

/**
 * InitiateIntegration Use Case (Input/Driving Port)
 *
 * Handles the first step of the OAuth flow by generating an authorization URL
 * and saving the state for CSRF protection.
 *
 * This is a "driving" port - external actors (controllers) use this interface.
 */
export interface InitiateIntegrationUseCase {
  /**
   * Execute the initiate integration flow
   *
   * @param command - The command with user ID, provider, and options
   * @returns The authorization URL and metadata
   */
  execute(
    command: InitiateIntegrationCommand,
  ): Promise<InitiateIntegrationResult>;
}
