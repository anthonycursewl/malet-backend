import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IntegrationProviderPort, UserProvisioningPort } from '../../domain';

/**
 * Provider Registry
 *
 * Central registry for managing integration providers and provisioning adapters.
 * Allows dynamic registration and retrieval of providers.
 */
@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);

  private readonly providers = new Map<string, IntegrationProviderPort>();
  private readonly provisioningAdapters = new Map<
    string,
    UserProvisioningPort
  >();

  onModuleInit() {
    this.logger.log(
      `Provider Registry initialized with ${this.providers.size} OAuth providers ` +
        `and ${this.provisioningAdapters.size} provisioning adapters`,
    );
  }

  /**
   * Register an OAuth provider
   */
  registerProvider(provider: IntegrationProviderPort): void {
    this.providers.set(provider.providerId, provider);
    this.logger.debug(`Registered OAuth provider: ${provider.providerId}`);
  }

  /**
   * Register a provisioning adapter
   */
  registerProvisioningAdapter(adapter: UserProvisioningPort): void {
    this.provisioningAdapters.set(adapter.providerId, adapter);
    this.logger.debug(`Registered provisioning adapter: ${adapter.providerId}`);
  }

  /**
   * Get an OAuth provider by ID
   */
  getProvider(providerId: string): IntegrationProviderPort | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get a provisioning adapter by ID
   */
  getProvisioningAdapter(providerId: string): UserProvisioningPort | undefined {
    return this.provisioningAdapters.get(providerId);
  }

  /**
   * Get all registered OAuth providers
   */
  getAllProviders(): Map<string, IntegrationProviderPort> {
    return new Map(this.providers);
  }

  /**
   * Get all registered provisioning adapters
   */
  getAllProvisioningAdapters(): Map<string, UserProvisioningPort> {
    return new Map(this.provisioningAdapters);
  }

  /**
   * Get list of available provider IDs
   */
  getAvailableProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Check if provisioning is available for a provider
   */
  hasProvisioningSupport(providerId: string): boolean {
    return this.provisioningAdapters.has(providerId);
  }
}
