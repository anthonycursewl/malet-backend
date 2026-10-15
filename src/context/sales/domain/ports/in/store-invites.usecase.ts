import { StoreMember } from '../../entities/store-member.entity';
import { StoreInvitePreview } from '../../types';

export const STORE_INVITES_USECASE = Symbol('STORE_INVITES_USECASE');

export interface GeneratedStoreInvite {
  token: string;
  /** Value encoded in the QR: `<prefix><token>`. */
  qr_payload: string;
  expires_at: Date;
}

export interface StoreInvitesUseCase {
  /** Generates (and rotates) the QR invitation code. Store owner only. */
  generate(store_id: string, user_id: string): Promise<GeneratedStoreInvite>;
  /** Revokes the active QR code without generating a new one. Store owner only. */
  revoke(store_id: string, user_id: string): Promise<{ revoked: number }>;
  /** Consent screen data for a scanned token: who invites and to which store. */
  preview(token: string): Promise<StoreInvitePreview>;
  /** Accepts the invitation: joins the store and consumes the token (single use). */
  accept(token: string, user_id: string): Promise<StoreMember>;
}
