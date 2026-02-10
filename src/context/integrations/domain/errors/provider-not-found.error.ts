import { IntegrationError } from './integration.error';

/**
 * Provider Not Found Error
 *
 * Thrown when the requested integration provider is not configured or available.
 */
export class ProviderNotFoundError extends IntegrationError {
  public readonly providerId: string;
  public readonly availableProviders: string[];

  constructor(providerId: string, availableProviders: string[] = []) {
    super(
      `Integration provider '${providerId}' not found or not configured`,
      'PROVIDER_NOT_FOUND',
      404,
    );
    this.providerId = providerId;
    this.availableProviders = availableProviders;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      providerId: this.providerId,
      availableProviders: this.availableProviders,
    };
  }
}
