import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  GetIntegrationsUseCase,
  GetIntegrationsQuery,
  IntegrationInfo,
  AvailableProvider,
  IntegrationProviderPort,
  LINKED_ACCOUNT_REPOSITORY_PORT,
  LinkedAccountRepositoryPort,
  LinkedAccount,
} from '../../domain';

/**
 * GetIntegrations Service
 *
 * Implements the GetIntegrationsUseCase port.
 * Retrieves integrations and available providers for a user.
 */
@Injectable()
export class GetIntegrationsService implements GetIntegrationsUseCase {
  private readonly logger = new Logger(GetIntegrationsService.name);

  constructor(
    @Inject('PROVIDER_REGISTRY')
    private readonly providerRegistry: Map<string, IntegrationProviderPort>,
    @Inject(LINKED_ACCOUNT_REPOSITORY_PORT)
    private readonly linkedAccountRepository: LinkedAccountRepositoryPort,
  ) {}

  async execute(query: GetIntegrationsQuery): Promise<IntegrationInfo[]> {
    this.logger.debug(`Getting integrations for user ${query.userId}`);

    let linkedAccounts: LinkedAccount[];

    if (query.provider) {
      const account = await this.linkedAccountRepository.findByUserAndProvider(
        query.userId,
        query.provider,
      );
      linkedAccounts = account ? [account] : [];
    } else {
      linkedAccounts = await this.linkedAccountRepository.findAllByUser(
        query.userId,
      );
    }

    // Filter active only if requested
    if (query.activeOnly) {
      linkedAccounts = linkedAccounts.filter((account) => account.isActive);
    }

    // Map to IntegrationInfo
    return linkedAccounts.map((account) => {
      const provider = this.providerRegistry.get(account.provider);

      return {
        provider: account.provider,
        displayName: provider?.displayName ?? account.provider,
        providerUserId: account.providerUserId,
        isActive: account.isActive,
        isTokenExpired: account.isTokenExpired(),
        scopes: account.scopes,
        connectedAt: account.createdAt,
        lastSyncAt: account.lastSyncAt,
        metadata: account.metadata ?? undefined,
      };
    });
  }

  async getByProvider(
    userId: string,
    provider: string,
  ): Promise<LinkedAccount | null> {
    return this.linkedAccountRepository.findByUserAndProvider(userId, provider);
  }

  async getAvailableProviders(userId: string): Promise<AvailableProvider[]> {
    this.logger.debug(`Getting available providers for user ${userId}`);

    const linkedAccounts =
      await this.linkedAccountRepository.findAllByUser(userId);
    const connectedProviders = new Set(
      linkedAccounts.filter((a) => a.isActive).map((a) => a.provider),
    );

    const providers: AvailableProvider[] = [];

    for (const [providerId, provider] of this.providerRegistry) {
      providers.push({
        provider: providerId,
        displayName: provider.displayName,
        isConnected: connectedProviders.has(providerId),
        supportsProvisioning: provider.supportsProvisioning,
      });
    }

    return providers;
  }
}
