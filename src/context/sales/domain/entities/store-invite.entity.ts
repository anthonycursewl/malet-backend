import { randomUUID } from 'crypto';

export interface StoreInvitePrimitives {
  id: string;
  store_id: string;
  created_by: string;
  token_hash: string;
  expires_at: Date;
  used_at?: Date | null;
  revoked_at?: Date | null;
  created_at: Date;
}

export class StoreInvite {
  private readonly id: string;
  private readonly store_id: string;
  private readonly created_by: string;
  private readonly token_hash: string;
  private readonly expires_at: Date;
  private readonly used_at: Date | null;
  private readonly revoked_at: Date | null;
  private readonly created_at: Date;

  constructor(
    id: string,
    store_id: string,
    created_by: string,
    token_hash: string,
    expires_at: Date,
    used_at: Date | null,
    revoked_at: Date | null,
    created_at: Date,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.created_by = created_by;
    this.token_hash = token_hash;
    this.expires_at = expires_at;
    this.used_at = used_at;
    this.revoked_at = revoked_at;
    this.created_at = created_at;
  }

  static create(data: {
    store_id: string;
    created_by: string;
    token_hash: string;
    ttl_ms: number;
  }): StoreInvite {
    const now = new Date();
    return new StoreInvite(
      randomUUID(),
      data.store_id,
      data.created_by,
      data.token_hash,
      new Date(now.getTime() + data.ttl_ms),
      null,
      null,
      now,
    );
  }

  static fromPrimitives(primitives: StoreInvitePrimitives): StoreInvite {
    return new StoreInvite(
      primitives.id,
      primitives.store_id,
      primitives.created_by,
      primitives.token_hash,
      primitives.expires_at,
      primitives.used_at ?? null,
      primitives.revoked_at ?? null,
      primitives.created_at,
    );
  }

  toPrimitives(): StoreInvitePrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      created_by: this.created_by,
      token_hash: this.token_hash,
      expires_at: this.expires_at,
      used_at: this.used_at,
      revoked_at: this.revoked_at,
      created_at: this.created_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getStoreId(): string {
    return this.store_id;
  }

  /** User that generated the invitation (the store owner). */
  getCreatedBy(): string {
    return this.created_by;
  }

  getTokenHash(): string {
    return this.token_hash;
  }

  getExpiresAt(): Date {
    return this.expires_at;
  }

  getUsedAt(): Date | null {
    return this.used_at;
  }

  getRevokedAt(): Date | null {
    return this.revoked_at;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expires_at.getTime() <= now.getTime();
  }

  isActive(now: Date = new Date()): boolean {
    return (
      this.used_at == null && this.revoked_at == null && !this.isExpired(now)
    );
  }
}
