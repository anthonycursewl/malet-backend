import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GeneratedStoreInvite,
  StoreInvitesUseCase,
} from '../domain/ports/in/store-invites.usecase';
import {
  STORE_MEMBERS_USECASE,
  StoreMembersUseCase,
} from '../domain/ports/in/store-members.usecase';
import { StoreInvite } from '../domain/entities/store-invite.entity';
import { Store } from '../domain/entities/store.entity';
import { StoreMember } from '../domain/entities/store-member.entity';
import { StoreInvitePreview } from '../domain/types';
import { STORE_INVITE_TTL_MS } from '../domain/constants';
import {
  STORE_INVITE_QR_PREFIX,
  generateInviteToken,
  normalizeInviteToken,
  sha256,
} from '../domain/invite-token';
import {
  STORE_INVITE_REPOSITORY_PORT,
  StoreInviteRepository,
} from '../domain/ports/out/store-invite.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';

@Injectable()
export class StoreInvitesService implements StoreInvitesUseCase {
  constructor(
    @Inject(STORE_INVITE_REPOSITORY_PORT)
    private readonly inviteRepository: StoreInviteRepository,
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(STORE_MEMBERS_USECASE)
    private readonly storeMembersUseCase: StoreMembersUseCase,
  ) {}

  async generate(
    store_id: string,
    user_id: string,
  ): Promise<GeneratedStoreInvite> {
    await this.getOwnedStore(store_id, user_id);

    // Rotation: only the newest QR stays valid.
    await this.inviteRepository.revokeActiveInvites(store_id);

    const { token, token_hash } = generateInviteToken();
    const invite = StoreInvite.create({
      store_id,
      created_by: user_id,
      token_hash,
      ttl_ms: STORE_INVITE_TTL_MS,
    });
    await this.inviteRepository.save(invite);

    return {
      token,
      qr_payload: `${STORE_INVITE_QR_PREFIX}${token}`,
      expires_at: invite.getExpiresAt(),
    };
  }

  async revoke(
    store_id: string,
    user_id: string,
  ): Promise<{ revoked: number }> {
    await this.getOwnedStore(store_id, user_id);
    const revoked = await this.inviteRepository.revokeActiveInvites(store_id);
    return { revoked };
  }

  async preview(token: string): Promise<StoreInvitePreview> {
    const invite = await this.findUsableInvite(token);

    const store = await this.storeRepository.findById(invite.getStoreId());
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const inviter = await this.storeRepository.findUserSummary(
      invite.getCreatedBy(),
    );

    return {
      store: { id: store.getId(), name: store.getName() },
      inviter,
      expires_at: invite.getExpiresAt(),
    };
  }

  async accept(token: string, user_id: string): Promise<StoreMember> {
    const invite = await this.findUsableInvite(token);

    // Atomic claim guarantees the token can only be used once.
    const claimed = await this.inviteRepository.claimInvite(invite.getId());
    if (!claimed) {
      throw new GoneException(
        'This invitation is no longer valid. Scan a fresh QR code.',
      );
    }

    try {
      return await this.storeMembersUseCase.add(
        invite.getStoreId(),
        invite.getCreatedBy(),
        { user_id },
      );
    } catch (error) {
      // The join failed: give the token back so the user can retry.
      await this.inviteRepository.releaseClaim(invite.getId());
      throw error;
    }
  }

  private async getOwnedStore(
    store_id: string,
    user_id: string,
  ): Promise<Store> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() !== user_id) {
      throw new ForbiddenException(
        'Only the store owner can manage QR invitations',
      );
    }
    return store;
  }

  private async findUsableInvite(token: string): Promise<StoreInvite> {
    const normalized = normalizeInviteToken(token);
    if (!normalized) {
      throw new NotFoundException('Invitation not found');
    }

    const invite = await this.inviteRepository.findInviteByTokenHash(
      sha256(normalized),
    );
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }
    if (invite.getRevokedAt()) {
      throw new GoneException(
        'This invitation has been revoked. Scan the current QR code.',
      );
    }
    if (invite.getUsedAt()) {
      throw new GoneException('This invitation has already been used.');
    }
    if (invite.isExpired()) {
      throw new GoneException(
        'This invitation has expired. Ask the owner for a new QR code.',
      );
    }

    return invite;
  }
}
