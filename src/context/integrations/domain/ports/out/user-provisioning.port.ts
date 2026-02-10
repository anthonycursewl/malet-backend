import { ProvisioningData } from '../../value-objects';
import { ProvisioningResult } from '../../entities';

/**
 * Injection token for UserProvisioningPort
 */
export const USER_PROVISIONING_PORT = 'USER_PROVISIONING_PORT';

/**
 * UserProvisioning Port (Output/Driven)
 *
 * Defines the contract for provisioning users in external systems.
 * This allows Malet to automatically create user accounts in partner systems.
 *
 * This is a "driven" port - the domain uses it to create users in external systems.
 */
export abstract class UserProvisioningPort {
  /**
   * Get the provider identifier
   */
  abstract readonly providerId: string;

  /**
   * Check if a user exists in the external system
   *
   * @param email - The email to check
   * @returns True if the user exists
   */
  abstract userExists(email: string): Promise<boolean>;

  /**
   * Find a user by email and return their provider ID
   *
   * @param email - The email to search for
   * @returns The provider user ID if found, null otherwise
   */
  abstract findUserByEmail(email: string): Promise<string | null>;

  /**
   * Provision (create) a new user in the external system
   *
   * @param data - The provisioning data
   * @returns The result of the provisioning attempt
   */
  abstract provisionUser(data: ProvisioningData): Promise<ProvisioningResult>;

  /**
   * Verify that a provisioned user has completed email verification
   *
   * @param providerUserId - The user's ID in the external system
   * @returns True if the user is verified
   */
  abstract isUserVerified(providerUserId: string): Promise<boolean>;

  /**
   * Get the registration URL for manual user creation
   *
   * @param email - Pre-fill the email in the registration form
   * @returns The registration URL
   */
  abstract getRegistrationUrl(email?: string): string;
}
