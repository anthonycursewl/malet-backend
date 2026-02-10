import { ProvisioningResult } from '../../entities';

/**
 * Injection token for ProvisionUserUseCase
 */
export const PROVISION_USER_USE_CASE = 'PROVISION_USER_USE_CASE';

/**
 * Command to provision a user
 */
export interface ProvisionUserCommand {
  provider: string;
  maletUserId: string;
  email: string;
  name: string;
  phone?: string;
  timezone?: string;
  locale?: string;
}

/**
 * ProvisionUser Use Case (Input/Driving Port)
 *
 * Handles the creation of users in external systems (auto-provisioning).
 * This is called when a user wants to connect with a provider but doesn't
 * have an account there yet.
 *
 * This is a "driving" port - external actors (other use cases, controllers) use this interface.
 */
export interface ProvisionUserUseCase {
  /**
   * Execute the user provisioning flow
   *
   * @param command - The provisioning command with user data
   * @returns The result of the provisioning attempt
   */
  execute(command: ProvisionUserCommand): Promise<ProvisioningResult>;
}
