import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { StoreInviteRepository } from '../../domain/ports/out/store-invite.repository';
import { StoreInvite } from '../../domain/entities/store-invite.entity';

@Injectable()
export class StoreInviteRepositoryAdapter implements StoreInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): StoreInvite {
    return StoreInvite.fromPrimitives({
      ...row,
      used_at: row.used_at ?? null,
      revoked_at: row.revoked_at ?? null,
    });
  }

  async save(invite: StoreInvite): Promise<StoreInvite> {
    const data = invite.toPrimitives();

    const created = await this.prisma.store_invites.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        created_by: data.created_by,
        token_hash: data.token_hash,
        expires_at: data.expires_at,
        used_at: null,
        revoked_at: null,
        created_at: data.created_at,
      },
    });

    return this.toEntity(created);
  }

  async findInviteByTokenHash(token_hash: string): Promise<StoreInvite | null> {
    const result = await this.prisma.store_invites.findUnique({
      where: { token_hash },
    });

    return result ? this.toEntity(result) : null;
  }

  async revokeActiveInvites(store_id: string): Promise<number> {
    const result = await this.prisma.store_invites.updateMany({
      where: {
        store_id,
        used_at: null,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });

    return result.count;
  }

  async claimInvite(invite_id: string): Promise<boolean> {
    const result = await this.prisma.store_invites.updateMany({
      where: {
        id: invite_id,
        used_at: null,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      data: { used_at: new Date() },
    });

    return result.count === 1;
  }

  async releaseClaim(invite_id: string): Promise<void> {
    await this.prisma.store_invites.updateMany({
      where: { id: invite_id, used_at: { not: null } },
      data: { used_at: null },
    });
  }
}
