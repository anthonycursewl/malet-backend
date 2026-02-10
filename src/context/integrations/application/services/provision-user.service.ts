import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ProvisionUserUseCase,
  ProvisionUserCommand,
  UserProvisioningPort,
} from '../../domain';
import { ProvisioningResult } from '../../domain/entities';
import { ProvisioningData } from '../../domain/value-objects';

/**
 * ProvisionUser Service
 *
 * Implements the ProvisionUserUseCase port.
 * Handles auto-provisioning of users in external systems.
 */
@Injectable()
export class ProvisionUserService implements ProvisionUserUseCase {
  private readonly logger = new Logger(ProvisionUserService.name);

  constructor(
    @Inject('PROVISIONING_REGISTRY')
    private readonly provisioningRegistry: Map<string, UserProvisioningPort>,
  ) {}

  async execute(command: ProvisionUserCommand): Promise<ProvisioningResult> {
    this.logger.log(
      `Provisioning user ${command.maletUserId} in ${command.provider}`,
    );

    // 1. Get the provisioning adapter
    const provisioningPort = this.provisioningRegistry.get(command.provider);

    if (!provisioningPort) {
      this.logger.warn(
        `Provider ${command.provider} does not support auto-provisioning`,
      );

      return ProvisioningResult.failed(
        command.provider,
        `Provider ${command.provider} does not support auto-provisioning`,
      );
    }

    try {
      // 2. Check if user already exists
      const existingUserId = await provisioningPort.findUserByEmail(
        command.email,
      );

      if (existingUserId) {
        this.logger.log(
          `User ${command.email} already exists in ${command.provider}`,
        );
        return ProvisioningResult.existing(
          command.provider,
          existingUserId,
          'User already exists in the external system',
        );
      }

      // 3. Create provisioning data
      const provisioningData = new ProvisioningData(
        command.email,
        command.name,
        command.maletUserId,
        {
          phone: command.phone,
          timezone: command.timezone,
          locale: command.locale,
        },
      );

      // 4. Provision user in external system
      const result = await provisioningPort.provisionUser(provisioningData);

      this.logger.log(
        `Provisioning result for ${command.email}: ${result.status} - ${result.message}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Provisioning failed for ${command.email}: ${error.message}`,
        error.stack,
      );

      // Return failed result with manual registration fallback
      return ProvisioningResult.failedWithManualFallback(
        command.provider,
        error.message || 'Failed to provision user',
        provisioningPort.getRegistrationUrl(command.email),
      );
    }
  }
}
