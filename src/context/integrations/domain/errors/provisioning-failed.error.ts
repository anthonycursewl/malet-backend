import { IntegrationError } from './integration.error';

/**
 * Provisioning Failed Error
 *
 * Thrown when user provisioning fails in an external system.
 */
export class ProvisioningFailedError extends IntegrationError {
  public readonly provider: string;
  public readonly reason: string;
  public readonly canRetry: boolean;
  public readonly fallbackUrl?: string;

  constructor(
    provider: string,
    reason: string,
    options?: {
      canRetry?: boolean;
      fallbackUrl?: string;
    },
  ) {
    super(
      `Failed to provision user in ${provider}: ${reason}`,
      'PROVISIONING_FAILED',
      502,
    );
    this.provider = provider;
    this.reason = reason;
    this.canRetry = options?.canRetry ?? false;
    this.fallbackUrl = options?.fallbackUrl;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      reason: this.reason,
      canRetry: this.canRetry,
      fallbackUrl: this.fallbackUrl,
    };
  }
}
