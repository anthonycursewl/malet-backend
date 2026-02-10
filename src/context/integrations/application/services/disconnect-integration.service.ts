import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DisconnectIntegrationUseCase,
  DisconnectIntegrationCommand,
  DisconnectIntegrationResult,
  IntegrationProviderPort,
  LINKED_ACCOUNT_REPOSITORY_PORT,
  LinkedAccountRepositoryPort,
  TOKEN_ENCRYPTION_PORT,
  TokenEncryptionPort,
} from '../../domain';

/**
 * DisconnectIntegration Service
 *
 * Implements the DisconnectIntegrationUseCase port.
 * Handles disconnecting users from external providers.
 */
@Injectable()
export class DisconnectIntegrationService implements DisconnectIntegrationUseCase {
  private readonly logger = new Logger(DisconnectIntegrationService.name);

  constructor(
    @Inject('PROVIDER_REGISTRY')
    private readonly providerRegistry: Map<string, IntegrationProviderPort>,
    @Inject(LINKED_ACCOUNT_REPOSITORY_PORT)
    private readonly linkedAccountRepository: LinkedAccountRepositoryPort,
    @Inject(TOKEN_ENCRYPTION_PORT)
    private readonly tokenEncryption: TokenEncryptionPort,
  ) {}

  async execute(
    command: DisconnectIntegrationCommand,
  ): Promise<DisconnectIntegrationResult> {
    this.logger.log(
      `Disconnecting user ${command.userId} from ${command.provider}`,
    );

    // 1. Find the linked account
    const linkedAccount =
      await this.linkedAccountRepository.findByUserAndProvider(
        command.userId,
        command.provider,
      );

    if (!linkedAccount) {
      return {
        success: false,
        provider: command.provider,
        tokensRevoked: false,
        message: `No linked account found for provider ${command.provider}`,
      };
    }

    let tokensRevoked = false;

    // 2. Optionally revoke tokens at the provider
    if (command.revokeTokens) {
      const provider = this.providerRegistry.get(command.provider);

      if (provider) {
        try {
          // Decrypt the access token
          const accessToken = this.tokenEncryption.decrypt(
            linkedAccount.accessToken,
          );

          tokensRevoked = await provider.revokeToken(accessToken);

          this.logger.log(
            `Tokens ${tokensRevoked ? 'revoked' : 'not revoked'} for ${command.provider}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to revoke tokens for ${command.provider}: ${error.message}`,
          );
          // Continue with disconnection even if revocation fails
        }
      }
    }

    // 3. Deactivate or delete the linked account
    await this.linkedAccountRepository.deactivate(
      command.userId,
      command.provider,
    );

    this.logger.log(
      `Successfully disconnected user ${command.userId} from ${command.provider}`,
    );

    return {
      success: true,
      provider: command.provider,
      tokensRevoked,
      message: `Successfully disconnected from ${command.provider}`,
    };
  }
}
