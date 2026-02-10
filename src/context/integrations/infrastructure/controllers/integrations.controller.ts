import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Res,
  Inject,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { PrismaService } from 'src/prisma.service';
import {
  INITIATE_INTEGRATION_USE_CASE,
  InitiateIntegrationUseCase,
  HANDLE_OAUTH_CALLBACK_USE_CASE,
  HandleOAuthCallbackUseCase,
  DISCONNECT_INTEGRATION_USE_CASE,
  DisconnectIntegrationUseCase,
  GET_INTEGRATIONS_USE_CASE,
  GetIntegrationsUseCase,
  OAUTH_STATE_REPOSITORY_PORT,
  OAuthStateRepositoryPort,
  ProviderNotFoundError,
  InvalidStateError,
  OAuthError,
} from '../../domain';
import { OAuthCallbackDto } from '../../application';

/**
 * User payload from JWT
 */
interface JwtUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

/**
 * Integrations Controller
 *
 * Handles HTTP requests for integration management.
 * Follows RESTful conventions and includes proper error handling.
 */
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    @Inject(INITIATE_INTEGRATION_USE_CASE)
    private readonly initiateIntegration: InitiateIntegrationUseCase,
    @Inject(HANDLE_OAUTH_CALLBACK_USE_CASE)
    private readonly handleOAuthCallback: HandleOAuthCallbackUseCase,
    @Inject(DISCONNECT_INTEGRATION_USE_CASE)
    private readonly disconnectIntegration: DisconnectIntegrationUseCase,
    @Inject(GET_INTEGRATIONS_USE_CASE)
    private readonly getIntegrations: GetIntegrationsUseCase,
    @Inject(OAUTH_STATE_REPOSITORY_PORT)
    private readonly oauthStateRepository: OAuthStateRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get user by ID for the GET callback
   */
  private async getUserById(
    userId: string,
  ): Promise<{ id: string; email: string; name: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return user;
  }

  /**
   * Get all integrations for the current user
   * GET /integrations
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listIntegrations(@CurrentUser() user: JwtUser) {
    this.logger.log(`Listing integrations for user ${user.id}`);

    const integrations = await this.getIntegrations.execute({
      userId: user.id,
      activeOnly: true,
    });

    return {
      success: true,
      data: integrations,
    };
  }

  /**
   * Get available providers with connection status
   * GET /integrations/providers
   */
  @Get('providers')
  @UseGuards(JwtAuthGuard)
  async listProviders(@CurrentUser() user: JwtUser) {
    this.logger.log(`Listing providers for user ${user.id}`);

    const providers = await this.getIntegrations.getAvailableProviders(user.id);

    return {
      success: true,
      data: providers,
    };
  }

  /**
   * Get a specific integration
   * GET /integrations/:provider
   */
  @Get(':provider')
  @UseGuards(JwtAuthGuard)
  async getIntegration(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: string,
  ) {
    this.logger.log(`Getting integration ${provider} for user ${user.id}`);

    const linkedAccount = await this.getIntegrations.getByProvider(
      user.id,
      provider,
    );

    if (!linkedAccount) {
      return {
        success: false,
        error: 'Integration not found',
      };
    }

    return {
      success: true,
      data: {
        provider: linkedAccount.provider,
        providerUserId: linkedAccount.providerUserId,
        isActive: linkedAccount.isActive,
        isTokenExpired: linkedAccount.isTokenExpired(),
        scopes: linkedAccount.scopes,
        connectedAt: linkedAccount.createdAt,
        lastSyncAt: linkedAccount.lastSyncAt,
      },
    };
  }

  /**
   * Initiate OAuth flow for a provider
   * GET /integrations/:provider/authorize
   *
   * Supports both web and mobile flows:
   * - Web: Uses standard redirect_url
   * - Mobile: Uses deep link (e.g., malet://integrations/callback)
   *
   * @param platform - 'web' | 'ios' | 'android' - Determines callback handling
   * @param redirect_url - Where to redirect after OAuth (can be deep link for mobile)
   */
  @Get(':provider/authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: string,
    @Query('scopes') scopes?: string,
    @Query('redirect_url') redirectUrl?: string,
    @Query('platform') platform?: 'web' | 'ios' | 'android',
  ) {
    this.logger.log(
      `Initiating OAuth for user ${user.id} with ${provider} (platform: ${platform || 'web'})`,
    );

    try {
      // For mobile, use the app's deep link as redirect
      const finalRedirectUrl = this.getMobileRedirectUrl(redirectUrl, platform);

      const result = await this.initiateIntegration.execute({
        userId: user.id,
        provider,
        scopes: scopes?.split(',').map((s) => s.trim()),
        redirectUrl: finalRedirectUrl,
      });

      return {
        success: true,
        data: {
          authorizationUrl: result.authorizationUrl,
          stateToken: result.stateToken, // Mobile apps need this
          expiresAt: result.expiresAt,
          platform: platform || 'web',
        },
      };
    } catch (error) {
      if (error instanceof ProviderNotFoundError) {
        return {
          success: false,
          error: error.message,
          availableProviders: error.availableProviders,
        };
      }
      throw error;
    }
  }

  /**
   * Get the appropriate redirect URL for mobile platforms
   */
  private getMobileRedirectUrl(
    providedUrl: string | undefined,
    _platform: string | undefined,
  ): string | undefined {
    // If a URL is provided, use it
    if (providedUrl) return providedUrl;

    // For mobile, return undefined to use the default callback URL
    // The mobile app will capture the deep link
    return undefined;
  }

  /**
   * Exchange OAuth code for tokens (Mobile-friendly endpoint)
   * POST /integrations/:provider/exchange
   *
   * This endpoint is designed for mobile apps that:
   * 1. Open system browser for OAuth
   * 2. Capture the redirect via deep link
   * 3. Send code and state to this endpoint
   *
   * The mobile app sends the code and state received from the deep link,
   * and this endpoint returns JSON with the result (no redirects).
   */
  @Post(':provider/exchange')
  @UseGuards(JwtAuthGuard)
  async exchangeCodeForTokens(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    this.logger.log(
      `Mobile OAuth exchange for user ${user.id} with ${provider}`,
    );

    if (!code || !state) {
      return {
        success: false,
        error: 'Missing required parameters: code and state',
      };
    }

    try {
      const result = await this.handleOAuthCallback.execute(
        {
          provider,
          code,
          state,
        },
        {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          requiresAction: result.requiresAction,
        };
      }

      return {
        success: true,
        data: {
          provider: result.provider,
          providerUserId: result.providerUserId,
          message: 'Successfully connected',
        },
      };
    } catch (error) {
      this.logger.error(
        `Mobile OAuth exchange error: ${error.message}`,
        error.stack,
      );

      if (error instanceof InvalidStateError) {
        return {
          success: false,
          error: 'Invalid or expired state token',
          errorCode: 'INVALID_STATE',
        };
      }

      if (error instanceof OAuthError) {
        return {
          success: false,
          error: error.message,
          errorCode: error.oauthErrorCode,
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Handle OAuth callback (redirect from provider)
   * GET /integrations/:provider/callback
   *
   * This endpoint handles the redirect from the OAuth provider.
   * It retrieves the user from the state token stored in the database.
   */
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query() query: OAuthCallbackDto,
    @Res() res: Response,
  ) {
    this.logger.log(`Handling OAuth callback for ${provider}`);

    // Check for OAuth errors from provider
    if (query.error) {
      this.logger.error(`OAuth error from ${provider}: ${query.error}`);
      return res.redirect(
        `/integrations/error?error=${encodeURIComponent(query.error)}&description=${encodeURIComponent(query.error_description || '')}`,
      );
    }

    try {
      // Retrieve the OAuth state from the database to get user context
      const oauthState = await this.oauthStateRepository.findByToken(
        query.state,
      );

      if (!oauthState) {
        this.logger.error('Invalid or expired OAuth state');
        return res.redirect('/integrations/error?error=invalid_state');
      }

      // Get user data from the database
      const user = await this.getUserById(oauthState.userId);

      if (!user) {
        this.logger.error(`User not found: ${oauthState.userId}`);
        return res.redirect('/integrations/error?error=user_not_found');
      }

      // Process the OAuth callback
      const result = await this.handleOAuthCallback.execute(
        {
          provider,
          code: query.code,
          state: query.state,
          error: query.error,
          errorDescription: query.error_description,
        },
        {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      );

      if (!result.success) {
        const errorMessage = result.error || 'unknown_error';

        if (result.requiresAction) {
          // Redirect to action required page
          return res.redirect(
            `/integrations/action-required?type=${result.requiresAction.type}&url=${encodeURIComponent(result.requiresAction.url || '')}`,
          );
        }

        return res.redirect(
          `/integrations/error?error=${encodeURIComponent(errorMessage)}`,
        );
      }

      // Success - redirect to success page or frontend
      const successUrl = oauthState.redirectUrl || '/integrations/success';
      return res.redirect(`${successUrl}?provider=${provider}&connected=true`);
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`, error.stack);

      if (error instanceof InvalidStateError) {
        return res.redirect('/integrations/error?error=invalid_state');
      }

      if (error instanceof OAuthError) {
        return res.redirect(
          `/integrations/error?error=${encodeURIComponent(error.message)}`,
        );
      }

      return res.redirect('/integrations/error?error=unexpected_error');
    }
  }

  /**
   * Handle authenticated OAuth callback (for SPA/mobile apps)
   * POST /integrations/:provider/callback
   */
  @Post(':provider/callback')
  @UseGuards(JwtAuthGuard)
  async callbackAuthenticated(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: string,
    @Query() query: OAuthCallbackDto,
  ) {
    this.logger.log(
      `Handling authenticated OAuth callback for user ${user.id}`,
    );

    try {
      const result = await this.handleOAuthCallback.execute(
        {
          provider,
          code: query.code,
          state: query.state,
          error: query.error,
          errorDescription: query.error_description,
        },
        {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          requiresAction: result.requiresAction,
        };
      }

      return {
        success: true,
        data: {
          provider: result.provider,
          providerUserId: result.providerUserId,
          message: 'Successfully connected',
        },
      };
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`, error.stack);

      if (error instanceof InvalidStateError || error instanceof OAuthError) {
        return {
          success: false,
          error: error.message,
        };
      }

      throw error;
    }
  }

  /**
   * Disconnect an integration
   * DELETE /integrations/:provider
   */
  @Delete(':provider')
  @UseGuards(JwtAuthGuard)
  async disconnect(
    @CurrentUser() user: JwtUser,
    @Param('provider') provider: string,
    @Query('revoke_tokens') revokeTokens?: string,
  ) {
    this.logger.log(`Disconnecting ${provider} for user ${user.id}`);

    const result = await this.disconnectIntegration.execute({
      userId: user.id,
      provider,
      revokeTokens: revokeTokens === 'true',
    });

    return {
      success: result.success,
      data: {
        provider: result.provider,
        tokensRevoked: result.tokensRevoked,
        message: result.message,
      },
    };
  }
}
