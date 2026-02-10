import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  HandleOAuthCallbackUseCase,
  HandleOAuthCallbackCommand,
  HandleOAuthCallbackResult,
  MaletUserData,
  ProvisionUserUseCase,
  PROVISION_USER_USE_CASE,
  IntegrationProviderPort,
  OAUTH_STATE_REPOSITORY_PORT,
  OAuthStateRepositoryPort,
  LINKED_ACCOUNT_REPOSITORY_PORT,
  LinkedAccountRepositoryPort,
  TOKEN_ENCRYPTION_PORT,
  TokenEncryptionPort,
  InvalidStateError,
  OAuthError,
  ProviderNotFoundError,
} from '../../domain';
import { ProvisioningStatus } from '../../domain/entities';

/**
 * HandleOAuthCallback Service
 *
 * Implements the HandleOAuthCallbackUseCase port.
 * Handles OAuth callbacks, token exchange, and account linking.
 * Supports auto-provisioning when user doesn't exist in external system.
 */
@Injectable()
export class HandleOAuthCallbackService implements HandleOAuthCallbackUseCase {
  private readonly logger = new Logger(HandleOAuthCallbackService.name);

  constructor(
    @Inject('PROVIDER_REGISTRY')
    private readonly providerRegistry: Map<string, IntegrationProviderPort>,
    @Inject(OAUTH_STATE_REPOSITORY_PORT)
    private readonly oauthStateRepository: OAuthStateRepositoryPort,
    @Inject(LINKED_ACCOUNT_REPOSITORY_PORT)
    private readonly linkedAccountRepository: LinkedAccountRepositoryPort,
    @Inject(TOKEN_ENCRYPTION_PORT)
    private readonly tokenEncryption: TokenEncryptionPort,
    @Inject(PROVISION_USER_USE_CASE)
    private readonly provisionUserUseCase: ProvisionUserUseCase,
  ) {}

  async execute(
    command: HandleOAuthCallbackCommand,
    maletUser: MaletUserData,
  ): Promise<HandleOAuthCallbackResult> {
    this.logger.log(
      `Handling OAuth callback for user ${maletUser.id} from ${command.provider}`,
    );

    // 1. Check for OAuth errors from provider
    if (command.error) {
      this.logger.error(
        `OAuth error from ${command.provider}: ${command.error}`,
      );
      return {
        success: false,
        userId: maletUser.id,
        provider: command.provider,
        error: command.errorDescription || command.error,
        errorCode: command.error,
      };
    }

    // 2. Get the provider adapter
    const provider = this.providerRegistry.get(command.provider);
    if (!provider) {
      throw new ProviderNotFoundError(
        command.provider,
        Array.from(this.providerRegistry.keys()),
      );
    }

    try {
      // 3. Validate and retrieve OAuth state
      const oauthState = await this.oauthStateRepository.findByToken(
        command.state,
      );

      if (!oauthState) {
        throw new InvalidStateError(command.provider);
      }

      if (!oauthState.verify(command.state)) {
        throw new InvalidStateError(command.provider);
      }

      // Clean up used state
      await this.oauthStateRepository.delete(command.state);

      // 4. Exchange code for tokens
      const tokens = await provider.exchangeCodeForTokens(
        command.code,
        oauthState.codeVerifier ?? undefined,
      );

      // 5. Try to get user info from provider
      let userInfo;
      try {
        userInfo = await provider.getUserInfo(tokens.accessToken);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not get user info, attempting provisioning: ${userInfoError.message}`,
        );

        // User might not exist - try auto-provisioning if supported
        if (provider.supportsProvisioning) {
          const provisionResult = await this.provisionUserUseCase.execute({
            provider: command.provider,
            maletUserId: maletUser.id,
            email: maletUser.email,
            name: maletUser.name,
            phone: maletUser.phone,
          });

          if (!provisionResult.isSuccess) {
            return {
              success: false,
              userId: maletUser.id,
              provider: command.provider,
              requiresAction: provisionResult.requiresAction,
              error: provisionResult.message,
            };
          }

          if (
            provisionResult.status === ProvisioningStatus.PENDING_VERIFICATION
          ) {
            return {
              success: false,
              userId: maletUser.id,
              provider: command.provider,
              providerUserId: provisionResult.providerUserId ?? undefined,
              requiresAction: provisionResult.requiresAction,
              error: 'Email verification required',
            };
          }

          // Retry getting user info after provisioning
          userInfo = await provider.getUserInfo(tokens.accessToken);
        } else {
          throw userInfoError;
        }
      }

      // 6. Encrypt tokens for storage
      const encryptedAccessToken = this.tokenEncryption.encrypt(
        tokens.accessToken,
      );
      const encryptedRefreshToken = tokens.refreshToken
        ? this.tokenEncryption.encrypt(tokens.refreshToken)
        : null;

      // 7. Create or update linked account
      const linkedAccount = await this.linkedAccountRepository.upsert({
        id: randomUUID(),
        userId: maletUser.id,
        provider: command.provider,
        providerUserId: userInfo.providerUserId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopesArray,
        metadata: userInfo.metadata ?? null,
        isActive: true,
      });

      this.logger.log(
        `Successfully linked account for user ${maletUser.id} with ${command.provider}`,
      );

      return {
        success: true,
        userId: maletUser.id,
        provider: command.provider,
        providerUserId: userInfo.providerUserId,
        linkedAccount,
      };
    } catch (error) {
      this.logger.error(
        `OAuth callback failed for user ${maletUser.id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof InvalidStateError || error instanceof OAuthError) {
        throw error;
      }

      return {
        success: false,
        userId: maletUser.id,
        provider: command.provider,
        error: error.message,
      };
    }
  }
}
