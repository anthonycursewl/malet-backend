import { LinkedAccount } from '../../entities';
import { RequiredAction } from '../../entities/provisioning-result.entity';

/**
 * Injection token for HandleOAuthCallbackUseCase
 */
export const HANDLE_OAUTH_CALLBACK_USE_CASE = 'HANDLE_OAUTH_CALLBACK_USE_CASE';

/**
 * Command to handle OAuth callback
 */
export interface HandleOAuthCallbackCommand {
  provider: string;
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Malet user data for provisioning if needed
 */
export interface MaletUserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

/**
 * Result of handling OAuth callback
 */
export interface HandleOAuthCallbackResult {
  success: boolean;
  userId: string;
  provider: string;
  providerUserId?: string;
  linkedAccount?: LinkedAccount;
  requiresAction?: RequiredAction;
  error?: string;
  errorCode?: string;
}

/**
 * HandleOAuthCallback Use Case (Input/Driving Port)
 *
 * Handles the OAuth callback, exchanges code for tokens, and creates
 * the linked account. May trigger auto-provisioning if user doesn't exist.
 *
 * This is a "driving" port - external actors (controllers) use this interface.
 */
export interface HandleOAuthCallbackUseCase {
  /**
   * Execute the OAuth callback handling flow
   *
   * @param command - The callback parameters from the provider
   * @param maletUser - The current Malet user data
   * @returns The result of the callback handling
   */
  execute(
    command: HandleOAuthCallbackCommand,
    maletUser: MaletUserData,
  ): Promise<HandleOAuthCallbackResult>;
}
