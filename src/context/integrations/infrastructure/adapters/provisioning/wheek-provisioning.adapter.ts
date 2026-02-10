import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UserProvisioningPort,
  ProvisioningResult,
  ProvisioningData,
  ProvisioningFailedError,
} from '../../../domain';

/**
 * Wheek Provisioning Adapter
 *
 * Implements UserProvisioningPort for auto-provisioning users in Wheek.
 * Uses Wheek's Partner API to create users on behalf of Malet.
 */
@Injectable()
export class WheekProvisioningAdapter extends UserProvisioningPort {
  private readonly logger = new Logger(WheekProvisioningAdapter.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly provisioningEnabled: boolean;

  readonly providerId = 'wheek';

  constructor(private readonly configService: ConfigService) {
    super();

    this.baseUrl = this.configService.getOrThrow('WHEEK_BASE_URL');
    this.apiKey = this.configService.get('WHEEK_PROVISIONING_API_KEY', '');
    this.provisioningEnabled =
      this.configService.get('WHEEK_PROVISIONING_ENABLED', 'false') === 'true';
  }

  async userExists(email: string): Promise<boolean> {
    const userId = await this.findUserByEmail(email);
    return userId !== null;
  }

  async findUserByEmail(email: string): Promise<string | null> {
    if (!this.provisioningEnabled || !this.apiKey) {
      this.logger.warn('Provisioning is disabled or API key not configured');
      return null;
    }

    try {
      this.logger.debug(`Looking up user by email in Wheek: ${email}`);

      const response = await fetch(
        `${this.baseUrl}/api/partners/users/lookup?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'X-Partner-API-Key': this.apiKey,
            Accept: 'application/json',
          },
        },
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logger.error(`User lookup failed: ${JSON.stringify(error)}`);
        return null;
      }

      const data = await response.json();
      return data.user_id || data.id;
    } catch (error) {
      this.logger.error(`Error looking up user in Wheek: ${error.message}`);
      return null;
    }
  }

  async provisionUser(data: ProvisioningData): Promise<ProvisioningResult> {
    if (!this.provisioningEnabled || !this.apiKey) {
      return ProvisioningResult.failedWithManualFallback(
        this.providerId,
        'Auto-provisioning is not enabled for this provider',
        this.getRegistrationUrl(data.email),
      );
    }

    try {
      this.logger.log(`Provisioning user ${data.email} in Wheek`);

      const payload = {
        email: data.email,
        name: data.name,
        first_name: data.firstName,
        last_name: data.lastName,
        external_partner_id: data.maletUserId,
        source: 'malet_integration',
        auto_verify_email: false, // User must verify their email
        send_welcome_email: true,
        metadata: {
          phone: data.phone,
          timezone: data.timezone,
          locale: data.locale,
        },
      };

      const response = await fetch(
        `${this.baseUrl}/api/partners/users/provision`,
        {
          method: 'POST',
          headers: {
            'X-Partner-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      // User created successfully - needs email verification
      if (response.status === 201) {
        this.logger.log(
          `User ${data.email} provisioned in Wheek, pending verification`,
        );

        return ProvisioningResult.pendingVerification(
          this.providerId,
          result.user_id || result.id,
          'Please check your email to verify your Wheek account before continuing.',
        );
      }

      // User already exists
      if (response.status === 200 && result.existing) {
        return ProvisioningResult.existing(
          this.providerId,
          result.user_id || result.id,
          'User already exists in Wheek',
        );
      }

      // User created and already verified (rare case)
      if (response.status === 200 && result.verified) {
        return ProvisioningResult.created(
          this.providerId,
          result.user_id || result.id,
          'User provisioned successfully',
        );
      }

      // Handle errors
      if (!response.ok) {
        throw new ProvisioningFailedError(
          this.providerId,
          result.message || result.error || 'Unknown error',
          {
            canRetry: response.status >= 500,
            fallbackUrl: this.getRegistrationUrl(data.email),
          },
        );
      }

      // Default success case
      return ProvisioningResult.created(
        this.providerId,
        result.user_id || result.id,
        'User provisioned successfully',
      );
    } catch (error) {
      this.logger.error(
        `Provisioning failed for ${data.email}: ${error.message}`,
        error.stack,
      );

      if (error instanceof ProvisioningFailedError) {
        throw error;
      }

      return ProvisioningResult.failedWithManualFallback(
        this.providerId,
        error.message || 'Failed to provision user',
        this.getRegistrationUrl(data.email),
      );
    }
  }

  async isUserVerified(providerUserId: string): Promise<boolean> {
    if (!this.provisioningEnabled || !this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/partners/users/${providerUserId}/status`,
        {
          headers: {
            'X-Partner-API-Key': this.apiKey,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.email_verified === true;
    } catch (error) {
      this.logger.warn(
        `Failed to check user verification status: ${error.message}`,
      );
      return false;
    }
  }

  getRegistrationUrl(email?: string): string {
    const params = new URLSearchParams({
      source: 'malet',
      utm_source: 'malet_integration',
    });

    if (email) {
      params.set('email', email);
    }

    return `${this.baseUrl}/register?${params.toString()}`;
  }
}
