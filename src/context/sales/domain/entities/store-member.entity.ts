import { randomUUID } from 'crypto';

export interface StoreMemberPrimitives {
  id: string;
  store_id: string;
  user_id: string;
  created_by: string;
  /** Recibe los avisos por email de la tienda (lo selecciona el dueño). */
  notify?: boolean;
  created_at: Date;
  deleted_at?: Date | null;
}

export class StoreMember {
  private readonly id: string;
  private readonly store_id: string;
  private readonly user_id: string;
  private readonly created_by: string;
  private readonly notify: boolean;
  private readonly created_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(primitives: StoreMemberPrimitives) {
    this.id = primitives.id;
    this.store_id = primitives.store_id;
    this.user_id = primitives.user_id;
    this.created_by = primitives.created_by;
    this.notify = primitives.notify === true;
    this.created_at = primitives.created_at;
    this.deleted_at = primitives.deleted_at ?? null;
  }

  static create(data: {
    store_id: string;
    user_id: string;
    created_by: string;
    notify?: boolean;
  }): StoreMember {
    return new StoreMember({
      id: randomUUID(),
      store_id: data.store_id,
      user_id: data.user_id,
      created_by: data.created_by,
      notify: data.notify === true,
      created_at: new Date(),
      deleted_at: null,
    });
  }

  static fromPrimitives(primitives: StoreMemberPrimitives): StoreMember {
    return new StoreMember(primitives);
  }

  toPrimitives(): StoreMemberPrimitives {
    return {
      id: this.id,
      store_id: this.store_id,
      user_id: this.user_id,
      created_by: this.created_by,
      notify: this.notify,
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

  /** ¿Este miembro recibe los avisos por email de la tienda? */
  notifies(): boolean {
    return this.notify;
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

  /** Marca si el miembro recibe los avisos por email. */
  withNotify(notify: boolean): StoreMember {
    return new StoreMember({ ...this.toPrimitives(), notify });
  }
}
