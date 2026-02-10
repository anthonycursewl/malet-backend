import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma.service';
import { OAuthStateRepositoryPort, OAuthState } from '../../../domain';

/**
 * Prisma OAuth State Repository Adapter
 *
 * Implements OAuthStateRepositoryPort using Prisma ORM.
 * Handles temporary OAuth state storage for CSRF protection.
 */
@Injectable()
export class PrismaOAuthStateRepository extends OAuthStateRepositoryPort {
  private readonly logger = new Logger(PrismaOAuthStateRepository.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(id: string, state: OAuthState): Promise<void> {
    const data = state.toPersistence();

    await this.prisma.oauth_state.create({
      data: {
        id,
        user_id: data.user_id as string,
        provider: data.provider as string,
        state_token: data.state_token as string,
        code_verifier: data.code_verifier as string | null,
        redirect_url: data.redirect_url as string | null,
        scopes: data.scopes as string[],
        expires_at: data.expires_at as Date,
        created_at: data.created_at as Date,
      },
    });

    this.logger.debug(
      `Saved OAuth state: ${id} for provider ${state.provider}`,
    );
  }

  async findByToken(stateToken: string): Promise<OAuthState | null> {
    const record = await this.prisma.oauth_state.findUnique({
      where: { state_token: stateToken },
    });

    if (!record) {
      return null;
    }

    // Check if expired
    if (new Date() >= record.expires_at) {
      // Clean up expired state
      await this.delete(stateToken);
      return null;
    }

    return OAuthState.fromPersistence({
      state_token: record.state_token,
      user_id: record.user_id,
      provider: record.provider,
      code_verifier: record.code_verifier,
      redirect_url: record.redirect_url,
      scopes: record.scopes,
      expires_at: record.expires_at,
      created_at: record.created_at,
    });
  }

  async delete(stateToken: string): Promise<void> {
    try {
      await this.prisma.oauth_state.delete({
        where: { state_token: stateToken },
      });
      this.logger.debug(`Deleted OAuth state: ${stateToken}`);
    } catch (error) {
      // Ignore if not found
      if (error.code !== 'P2025') {
        throw error;
      }
    }
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.oauth_state.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired OAuth states`);
    }

    return result.count;
  }

  async findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<OAuthState | null> {
    const record = await this.prisma.oauth_state.findFirst({
      where: {
        user_id: userId,
        provider: provider,
        expires_at: {
          gt: new Date(),
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!record) {
      return null;
    }

    return OAuthState.fromPersistence({
      state_token: record.state_token,
      user_id: record.user_id,
      provider: record.provider,
      code_verifier: record.code_verifier,
      redirect_url: record.redirect_url,
      scopes: record.scopes,
      expires_at: record.expires_at,
      created_at: record.created_at,
    });
  }
}
