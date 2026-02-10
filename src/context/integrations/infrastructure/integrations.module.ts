import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

// Domain Ports
import {
  INITIATE_INTEGRATION_USE_CASE,
  HANDLE_OAUTH_CALLBACK_USE_CASE,
  PROVISION_USER_USE_CASE,
  DISCONNECT_INTEGRATION_USE_CASE,
  GET_INTEGRATIONS_USE_CASE,
  LINKED_ACCOUNT_REPOSITORY_PORT,
  OAUTH_STATE_REPOSITORY_PORT,
  TOKEN_ENCRYPTION_PORT,
  IntegrationProviderPort,
  UserProvisioningPort,
} from '../domain';

// Application Services
import {
  InitiateIntegrationService,
  HandleOAuthCallbackService,
  ProvisionUserService,
  DisconnectIntegrationService,
  GetIntegrationsService,
} from '../application';

// Infrastructure Adapters
import {
  PrismaLinkedAccountRepository,
  PrismaOAuthStateRepository,
} from './adapters/persistence';
import { AESTokenEncryptionAdapter } from './adapters/encryption';
import { WheekOAuthAdapter } from './adapters/oauth';
import { WheekProvisioningAdapter } from './adapters/provisioning';

// Registry & Controllers
import { ProviderRegistry } from './registry';
import { IntegrationsController } from './controllers';

// Shared
import { PrismaModule } from 'src/prisma.module';

/**
 * Integrations Module
 *
 * Main module for external integrations (OAuth, Provisioning).
 * Follows hexagonal architecture with proper dependency injection.
 */
@Module({
  imports: [ConfigModule, HttpModule, PrismaModule],
  controllers: [IntegrationsController],
  providers: [
    // Registry
    ProviderRegistry,

    // Infrastructure Adapters - Persistence
    {
      provide: LINKED_ACCOUNT_REPOSITORY_PORT,
      useClass: PrismaLinkedAccountRepository,
    },
    {
      provide: OAUTH_STATE_REPOSITORY_PORT,
      useClass: PrismaOAuthStateRepository,
    },

    // Infrastructure Adapters - Encryption
    {
      provide: TOKEN_ENCRYPTION_PORT,
      useClass: AESTokenEncryptionAdapter,
    },

    // Infrastructure Adapters - OAuth Providers
    WheekOAuthAdapter,

    // Infrastructure Adapters - Provisioning
    WheekProvisioningAdapter,

    // Provider Registry Maps
    {
      provide: 'PROVIDER_REGISTRY',
      useFactory: (
        wheekOAuth: WheekOAuthAdapter,
      ): Map<string, IntegrationProviderPort> => {
        const registry = new Map<string, IntegrationProviderPort>();
        registry.set(wheekOAuth.providerId, wheekOAuth);
        // Add more providers here as needed
        return registry;
      },
      inject: [WheekOAuthAdapter],
    },
    {
      provide: 'PROVISIONING_REGISTRY',
      useFactory: (
        wheekProvisioning: WheekProvisioningAdapter,
      ): Map<string, UserProvisioningPort> => {
        const registry = new Map<string, UserProvisioningPort>();
        registry.set(wheekProvisioning.providerId, wheekProvisioning);
        // Add more provisioning adapters here as needed
        return registry;
      },
      inject: [WheekProvisioningAdapter],
    },

    // Application Services - Use Cases
    {
      provide: PROVISION_USER_USE_CASE,
      useClass: ProvisionUserService,
    },
    {
      provide: INITIATE_INTEGRATION_USE_CASE,
      useClass: InitiateIntegrationService,
    },
    {
      provide: HANDLE_OAUTH_CALLBACK_USE_CASE,
      useClass: HandleOAuthCallbackService,
    },
    {
      provide: DISCONNECT_INTEGRATION_USE_CASE,
      useClass: DisconnectIntegrationService,
    },
    {
      provide: GET_INTEGRATIONS_USE_CASE,
      useClass: GetIntegrationsService,
    },
  ],
  exports: [
    // Export use cases for other modules
    INITIATE_INTEGRATION_USE_CASE,
    HANDLE_OAUTH_CALLBACK_USE_CASE,
    PROVISION_USER_USE_CASE,
    DISCONNECT_INTEGRATION_USE_CASE,
    GET_INTEGRATIONS_USE_CASE,
    // Export ports for testing
    LINKED_ACCOUNT_REPOSITORY_PORT,
    TOKEN_ENCRYPTION_PORT,
    // Export registry
    ProviderRegistry,
    'PROVIDER_REGISTRY',
    'PROVISIONING_REGISTRY',
  ],
})
export class IntegrationsModule implements OnModuleInit {
  private readonly logger = new Logger(IntegrationsModule.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly wheekOAuth: WheekOAuthAdapter,
    private readonly wheekProvisioning: WheekProvisioningAdapter,
  ) {}

  onModuleInit() {
    // Register providers in the registry service
    this.providerRegistry.registerProvider(this.wheekOAuth);
    this.providerRegistry.registerProvisioningAdapter(this.wheekProvisioning);

    this.logger.log('IntegrationsModule initialized');
    this.logger.log(
      `Available OAuth providers: ${this.providerRegistry.getAvailableProviderIds().join(', ')}`,
    );
  }
}
