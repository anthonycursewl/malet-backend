import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InitiateIntegrationUseCase,
  InitiateIntegrationCommand,
  InitiateIntegrationResult,
  IntegrationProviderPort,
  OAUTH_STATE_REPOSITORY_PORT,
  OAuthStateRepositoryPort,
  ProviderNotFoundError,
} from '../../domain';
import { OAuthState } from '../../domain/value-objects';

/**
 * InitiateIntegration Service
 *
 * Implements the InitiateIntegrationUseCase port.
 * Handles the first step of OAuth by generating authorization URL.
 */
@Injectable()
export class InitiateIntegrationService implements InitiateIntegrationUseCase {
  private readonly logger = new Logger(InitiateIntegrationService.name);

  constructor(
    @Inject('PROVIDER_REGISTRY')
    private readonly providerRegistry: Map<string, IntegrationProviderPort>,
    @Inject(OAUTH_STATE_REPOSITORY_PORT)
    private readonly oauthStateRepository: OAuthStateRepositoryPort,
  ) {}

  async execute(
    command: InitiateIntegrationCommand,
  ): Promise<InitiateIntegrationResult> {
    this.logger.log(
      `Initiating integration for user ${command.userId} with provider ${command.provider}`,
    );

    // 1. Get the provider adapter
    const provider = this.providerRegistry.get(command.provider);
    if (!provider) {
      throw new ProviderNotFoundError(
        command.provider,
        Array.from(this.providerRegistry.keys()),
      );
    }

    // 2. Determine scopes
    const scopes = command.scopes?.length
      ? command.scopes
      : provider.getDefaultScopes();

    // 3. Create OAuth state with PKCE support
    const oauthState = OAuthState.createWithPKCE(
      command.userId,
      command.provider,
      scopes,
      command.redirectUrl,
    );

    // 4. Save state to database
    const stateId = randomUUID();
    await this.oauthStateRepository.save(stateId, oauthState);

    // 5. Generate PKCE code challenge
    const codeChallenge = oauthState.codeVerifier
      ? await this.generateCodeChallenge(oauthState.codeVerifier)
      : undefined;

    // 6. Generate authorization URL
    const authorizationUrl = provider.getAuthorizationUrl(
      oauthState.stateToken,
      scopes,
      codeChallenge,
    );

    this.logger.log(
      `Generated authorization URL for provider ${command.provider}`,
    );

    return {
      authorizationUrl,
      stateToken: oauthState.stateToken,
      expiresAt: oauthState.expiresAt,
    };
  }

  /**
   * Generate PKCE code challenge from verifier
   * Using SHA-256 with base64url encoding
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }
}
