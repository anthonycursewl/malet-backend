import { Store } from '../../entities/store.entity';
import { StoreMember } from '../../entities/store-member.entity';
import { UserSummary } from '../../types';

export const STORE_REPOSITORY_PORT = Symbol('STORE_REPOSITORY_PORT');

export interface ListStoresForMemberOptions {
  user_id: string;
  take: number;
  cursor?: string;
}

export interface ListMemberSummariesOptions {
  store_id: string;
  take: number;
  /** Keyset cursor: the `seq` of the last member of the previous page. */
  cursor?: number;
}

/** Member row with only the info the list needs (name, avatar, banner, verification). */
export interface MemberSummary {
  id: string;
  user_id: string;
  seq: number;
  name: string | null;
  avatar_url: string | null;
  /** Decorative cover of the member card. */
  banner_url: string | null;
  verified: boolean;
  /** Verification type key (`main`, `business`, `ai`, `org`, ...). */
  verification_type: string | null;
}

/** Miembro destinatario de los avisos por email de la tienda. */
export interface NotificationRecipient {
  user_id: string;
  name: string | null;
  /** Foto de perfil del miembro. */
  avatar_url: string | null;
  email: string;
  /** Recibe los avisos (lo selecciona el dueño). */
  notify: boolean;
}

export interface StoreRepository {
  /** Saves the store and its owner membership atomically. */
  saveWithOwnerMember(store: Store, ownerMember: StoreMember): Promise<Store>;
  findById(store_id: string, include_deleted?: boolean): Promise<Store | null>;
  findStoresForMember(options: ListStoresForMemberOptions): Promise<Store[]>;
  update(store: Store): Promise<Store>;
  delete(store_id: string): Promise<Store>;
  restore(store_id: string): Promise<Store>;
  /** Permanently removes the store together with members, products, payment methods and sales. */
  hardDelete(store_id: string): Promise<void>;

  saveMember(member: StoreMember): Promise<StoreMember>;
  findMemberById(
    store_id: string,
    member_id: string,
    include_deleted?: boolean,
  ): Promise<StoreMember | null>;
  /**
   * Keyset paginated members with only the info the list needs
   * (name, avatar, banner and verification) to keep the query light.
   */
  findMemberSummaries(
    options: ListMemberSummariesOptions,
  ): Promise<MemberSummary[]>;
  /** Active (not soft-deleted) membership of a user in a store. */
  findMembership(
    store_id: string,
    user_id: string,
  ): Promise<StoreMember | null>;
  findMemberByUser(
    store_id: string,
    user_id: string,
    include_deleted?: boolean,
  ): Promise<StoreMember | null>;
  updateMember(member: StoreMember): Promise<StoreMember>;
  deleteMember(member_id: string): Promise<StoreMember>;
  restoreMember(member_id: string): Promise<StoreMember>;
  hardDeleteMember(member_id: string): Promise<void>;
  countActiveMembers(store_id: string): Promise<number>;
  /** Whether the store has (active) sales: locks the store currency. */
  hasSales(store_id: string): Promise<boolean>;
  userExists(user_id: string): Promise<boolean>;
  findUserSummary(user_id: string): Promise<UserSummary | null>;

  /**
   * Miembros activos de la tienda con su email y si reciben avisos (el dueño
   * los selecciona). Incluye al dueño si es miembro.
   */
  findNotificationRecipients(store_id: string): Promise<NotificationRecipient[]>;
  /** Marca exactamente a qué miembros llegan los avisos de la tienda. */
  setMemberNotify(store_id: string, user_ids: string[]): Promise<void>;
  /** Tiendas con el resumen diario de ventas activado (para el cron). */
  findStoresWithDigest(): Promise<Store[]>;
}
