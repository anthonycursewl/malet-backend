import { StoreInvite } from '../../entities/store-invite.entity';

export const STORE_INVITE_REPOSITORY_PORT = Symbol(
  'STORE_INVITE_REPOSITORY_PORT',
);

export interface StoreInviteRepository {
  save(invite: StoreInvite): Promise<StoreInvite>;
  findInviteByTokenHash(token_hash: string): Promise<StoreInvite | null>;
  /** Revokes every still-unused invite of the store; returns how many were revoked. */
  revokeActiveInvites(store_id: string): Promise<number>;
  /** Atomically claims the invite (only if unused, unrevoked and unexpired). */
  claimInvite(invite_id: string): Promise<boolean>;
  /** Releases a claim after a failed join attempt. */
  releaseClaim(invite_id: string): Promise<void>;
}
