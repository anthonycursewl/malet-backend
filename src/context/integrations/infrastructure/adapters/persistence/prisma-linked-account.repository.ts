import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  LinkedAccountRepositoryPort,
  UpsertLinkedAccountData,
  LinkedAccount,
} from '../../../domain';

/**
 * Prisma Linked Account Repository Adapter
 *
 * Implements LinkedAccountRepositoryPort using Prisma ORM.
 */
@Injectable()
export class PrismaLinkedAccountRepository extends LinkedAccountRepositoryPort {
  private readonly logger = new Logger(PrismaLinkedAccountRepository.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<LinkedAccount | null> {
    const record = await this.prisma.linked_account.findUnique({
      where: {
        user_id_provider: {
          user_id: userId,
          provider: provider,
        },
      },
    });

    return record ? LinkedAccount.fromPersistence(record) : null;
  }

  async findAllByUser(userId: string): Promise<LinkedAccount[]> {
    const records = await this.prisma.linked_account.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return records.map((record) => LinkedAccount.fromPersistence(record));
  }

  async findByProviderUserId(
    provider: string,
    providerUserId: string,
  ): Promise<LinkedAccount | null> {
    const record = await this.prisma.linked_account.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
      },
    });

    return record ? LinkedAccount.fromPersistence(record) : null;
  }

  async upsert(data: UpsertLinkedAccountData): Promise<LinkedAccount> {
    const now = new Date();
    const id = data.id ?? randomUUID();

    const record = await this.prisma.linked_account.upsert({
      where: {
        user_id_provider: {
          user_id: data.userId,
          provider: data.provider,
        },
      },
      create: {
        id,
        user_id: data.userId,
        provider: data.provider,
        provider_user_id: data.providerUserId,
        access_token: data.accessToken,
        refresh_token: data.refreshToken ?? null,
        token_expires_at: data.tokenExpiresAt ?? null,
        scopes: data.scopes,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        is_active: data.isActive ?? true,
        last_sync_at: now,
        created_at: now,
        updated_at: now,
      },
      update: {
        provider_user_id: data.providerUserId,
        access_token: data.accessToken,
        refresh_token: data.refreshToken ?? null,
        token_expires_at: data.tokenExpiresAt ?? null,
        scopes: data.scopes,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        is_active: data.isActive ?? true,
        last_sync_at: now,
        updated_at: now,
      },
    });

    this.logger.debug(
      `Upserted linked account: ${id} for provider ${data.provider}`,
    );

    return LinkedAccount.fromPersistence(record);
  }

  async updateTokens(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
  ): Promise<LinkedAccount> {
    const record = await this.prisma.linked_account.update({
      where: {
        user_id_provider: {
          user_id: userId,
          provider: provider,
        },
      },
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        last_sync_at: new Date(),
        updated_at: new Date(),
      },
    });

    return LinkedAccount.fromPersistence(record);
  }

  async deactivate(userId: string, provider: string): Promise<void> {
    await this.prisma.linked_account.update({
      where: {
        user_id_provider: {
          user_id: userId,
          provider: provider,
        },
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    this.logger.debug(
      `Deactivated linked account for user ${userId}, provider ${provider}`,
    );
  }

  async delete(userId: string, provider: string): Promise<void> {
    await this.prisma.linked_account.delete({
      where: {
        user_id_provider: {
          user_id: userId,
          provider: provider,
        },
      },
    });

    this.logger.debug(
      `Deleted linked account for user ${userId}, provider ${provider}`,
    );
  }

  async findExpiringTokens(withinMinutes: number): Promise<LinkedAccount[]> {
    const expirationThreshold = new Date(
      Date.now() + withinMinutes * 60 * 1000,
    );

    const records = await this.prisma.linked_account.findMany({
      where: {
        is_active: true,
        token_expires_at: {
          lte: expirationThreshold,
        },
        refresh_token: {
          not: null,
        },
      },
    });

    return records.map((record) => LinkedAccount.fromPersistence(record));
  }
}
