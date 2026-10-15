import { randomUUID } from 'crypto';

export interface StoreMemberPrimitives {
  id: string;
  store_id: string;
  user_id: string;
  created_by: string;
  created_at: Date;
  deleted_at?: Date | null;
}

export class StoreMember {
  private readonly id: string;
  private readonly store_id: string;
  private readonly user_id: string;
  private readonly created_by: string;
  private readonly created_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(
    id: string,
    store_id: string,
    user_id: string,
    created_by: string,
    created_at: Date,
    deleted_at?: Date | null,
  ) {
    this.id = id;
    this.store_id = store_id;
    this.user_id = user_id;
    this.created_by = created_by;
    this.created_at = created_at;
    this.deleted_at = deleted_at;
  }

  static create(data: {
    store_id: string;
    user_id: string;
    created_by: string;
  }): StoreMember {
    return new StoreMember(
      randomUUID(),
      data.store_id,
      data.user_id,
      data.created_by,
      new Date(),
      null,
    );
  }

  static fromPrimitives(primitives: StoreMemberPrimitives): StoreMember {
    return new StoreMember(
      primitives.id,
      primitives.store_id,
      primitives.user_id,
      primitives.created_by,
      primitives.created_at,
      primitives.deleted_at,
    );
  }

  toPrimitives(): StoreMemberPrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      user_id: this.user_id,
      created_by: this.created_by,
      created_at: this.created_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getStoreId(): string {
    return this.store_id;
  }

  getUserId(): string {
    return this.user_id;
  }

  /** User that added this member: the only one allowed to hard-delete it. */
  getCreatedBy(): string {
    return this.created_by;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }
}
