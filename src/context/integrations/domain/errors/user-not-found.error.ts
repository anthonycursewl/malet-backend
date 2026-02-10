import { IntegrationError } from './integration.error';

/**
 * User Not Found Error
 *
 * Thrown when a user cannot be found in an external provider system.
 */
export class UserNotFoundError extends IntegrationError {
  public readonly provider: string;
  public readonly email?: string;

  constructor(provider: string, email?: string) {
    const message = email
      ? `User with email ${email} not found in ${provider}`
      : `User not found in ${provider}`;

    super(message, 'USER_NOT_FOUND', 404);
    this.provider = provider;
    this.email = email;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      email: this.email,
    };
  }
}
