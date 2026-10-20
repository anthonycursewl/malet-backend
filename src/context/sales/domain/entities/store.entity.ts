import { randomUUID } from 'crypto';
import {
  DEFAULT_NOTIFICATION_EVENTS,
  NotificationGroup,
  StoreCurrency,
  StorePhotoEditMode,
  StoreReceiptMode,
} from '../constants';

/** Resoluciones soportadas para las fotos de la tienda. */
export interface StorePhotoVariants {
  small?: string | null;
  medium?: string | null;
  large?: string | null;
}

/** Grupos de avisos por email activos en la tienda. */
export type StoreNotificationEvents = Record<NotificationGroup, boolean>;

export interface StorePrimitives {
  id: string;
  name: string;
  user_id: string;
  currency: StoreCurrency;
  /** Contact info printed on the receipts (issuer data). */
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Política de recibos de la tienda (solo el dueño puede cambiarla). */
  receipt_mode?: StoreReceiptMode;
  /** Avisos por email activos (solo el dueño los cambia). */
  notification_events?: StoreNotificationEvents | null;
  /** Resumen diario de las ventas del día (solo el dueño). */
  notification_digest?: boolean;
  /** Quién puede cambiar la foto de perfil (lo decide el dueño). */
  avatar_edit_mode?: StorePhotoEditMode;
  /** Quién puede cambiar el banner (lo decide el dueño). */
  banner_edit_mode?: StorePhotoEditMode;
  /** Fotos de la tienda en 3 resoluciones. */
  avatar_small_url?: string | null;
  avatar_medium_url?: string | null;
  avatar_large_url?: string | null;
  banner_small_url?: string | null;
  banner_medium_url?: string | null;
  banner_large_url?: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class Store {
  private readonly id: string;
  private readonly name: string;
  private readonly user_id: string;
  private readonly currency: StoreCurrency;
  private readonly phone: string | null;
  private readonly email: string | null;
  private readonly address: string | null;
  private readonly receipt_mode: StoreReceiptMode;
  private readonly notification_events: StoreNotificationEvents;
  private readonly notification_digest: boolean;
  private readonly avatar_edit_mode: StorePhotoEditMode;
  private readonly banner_edit_mode: StorePhotoEditMode;
  private readonly avatar_small_url: string | null;
  private readonly avatar_medium_url: string | null;
  private readonly avatar_large_url: string | null;
  private readonly banner_small_url: string | null;
  private readonly banner_medium_url: string | null;
  private readonly banner_large_url: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at?: Date | null;

  constructor(primitives: StorePrimitives) {
    this.id = primitives.id;
    this.name = primitives.name;
    this.user_id = primitives.user_id;
    this.currency = primitives.currency ?? 'Bs';
    this.phone = primitives.phone ?? null;
    this.email = primitives.email ?? null;
    this.address = primitives.address ?? null;
    this.receipt_mode = primitives.receipt_mode ?? 'ask';
    this.notification_events = {
      ...DEFAULT_NOTIFICATION_EVENTS,
      ...(primitives.notification_events ?? {}),
    };
    this.notification_digest = primitives.notification_digest === true;
    this.avatar_edit_mode = primitives.avatar_edit_mode ?? 'owner';
    this.banner_edit_mode = primitives.banner_edit_mode ?? 'owner';
    this.avatar_small_url = primitives.avatar_small_url ?? null;
    this.avatar_medium_url = primitives.avatar_medium_url ?? null;
    this.avatar_large_url = primitives.avatar_large_url ?? null;
    this.banner_small_url = primitives.banner_small_url ?? null;
    this.banner_medium_url = primitives.banner_medium_url ?? null;
    this.banner_large_url = primitives.banner_large_url ?? null;
    this.created_at = primitives.created_at;
    this.updated_at = primitives.updated_at;
    this.deleted_at = primitives.deleted_at ?? null;
  }

  static create(data: {
    name: string;
    user_id: string;
    currency: StoreCurrency;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    receipt_mode?: StoreReceiptMode;
  }): Store {
    const now = new Date();
    return new Store({
      id: randomUUID(),
      name: data.name.trim(),
      user_id: data.user_id,
      currency: data.currency,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      receipt_mode: data.receipt_mode ?? 'ask',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  static fromPrimitives(primitives: StorePrimitives): Store {
    return new Store(primitives);
  }

  toPrimitives(): StorePrimitives {
    return {
      id: this.id,
      name: this.name,
      user_id: this.user_id,
      currency: this.currency,
      phone: this.phone,
      email: this.email,
      address: this.address,
      receipt_mode: this.receipt_mode,
      notification_events: this.notification_events,
      notification_digest: this.notification_digest,
      avatar_edit_mode: this.avatar_edit_mode,
      banner_edit_mode: this.banner_edit_mode,
      avatar_small_url: this.avatar_small_url,
      avatar_medium_url: this.avatar_medium_url,
      avatar_large_url: this.avatar_large_url,
      banner_small_url: this.banner_small_url,
      banner_medium_url: this.banner_medium_url,
      banner_large_url: this.banner_large_url,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  /** Owner of the store: the only user allowed to hard-delete it. */
  getUserId(): string {
    return this.user_id;
  }

  /** Currency of every amount belonging to this store. */
  getCurrency(): StoreCurrency {
    return this.currency;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getEmail(): string | null {
    return this.email;
  }

  getAddress(): string | null {
    return this.address;
  }

  /** Política de recibos: `ask` | `always` | `never`. */
  getReceiptMode(): StoreReceiptMode {
    return this.receipt_mode;
  }

  /** Avisos por email activos de la tienda. */
  getNotificationEvents(): StoreNotificationEvents {
    return { ...this.notification_events };
  }

  /** ¿La tienda avisa por email este grupo de eventos? */
  notifiesGroup(group: NotificationGroup): boolean {
    return this.notification_events[group] === true;
  }

  /** ¿La tienda envía además el resumen diario de ventas? */
  sendsDailyDigest(): boolean {
    return this.notification_digest;
  }

  /** Quién puede cambiar la foto de perfil o el banner. */
  getPhotoEditMode(kind: 'avatar' | 'banner'): StorePhotoEditMode {
    return kind === 'avatar' ? this.avatar_edit_mode : this.banner_edit_mode;
  }

  /** ¿Un miembro (que no es el dueño) puede cambiar esta foto? */
  membersCanEditPhoto(kind: 'avatar' | 'banner'): boolean {
    return this.getPhotoEditMode(kind) === 'members';
  }

  /** URLs del avatar (o del banner) en sus 3 resoluciones. */
  getPhotos(kind: 'avatar' | 'banner'): StorePhotoVariants {
    return kind === 'avatar'
      ? {
          small: this.avatar_small_url,
          medium: this.avatar_medium_url,
          large: this.avatar_large_url,
        }
      : {
          small: this.banner_small_url,
          medium: this.banner_medium_url,
          large: this.banner_large_url,
        };
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }

  getDeletedAt(): Date | null | undefined {
    return this.deleted_at;
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  update(
    data: Partial<
      Pick<
        StorePrimitives,
        | 'name'
        | 'currency'
        | 'phone'
        | 'email'
        | 'address'
        | 'receipt_mode'
        | 'avatar_edit_mode'
        | 'banner_edit_mode'
      >
    >,
  ): Store {
    return new Store({
      ...this.toPrimitives(),
      name: data.name !== undefined ? data.name.trim() : this.name,
      currency: data.currency !== undefined ? data.currency : this.currency,
      phone: data.phone !== undefined ? data.phone?.trim() || null : this.phone,
      email: data.email !== undefined ? data.email?.trim() || null : this.email,
      address:
        data.address !== undefined
          ? data.address?.trim() || null
          : this.address,
      receipt_mode:
        data.receipt_mode !== undefined ? data.receipt_mode : this.receipt_mode,
      avatar_edit_mode:
        data.avatar_edit_mode !== undefined
          ? data.avatar_edit_mode
          : this.avatar_edit_mode,
      banner_edit_mode:
        data.banner_edit_mode !== undefined
          ? data.banner_edit_mode
          : this.banner_edit_mode,
      updated_at: new Date(),
    });
  }

  /** Reemplaza las URLs de las fotos (avatar o banner) en sus resoluciones. */ withPhotos(
    kind: 'avatar' | 'banner',
    variants: StorePhotoVariants,
  ): Store {
    const base = this.toPrimitives();
    const next: StorePrimitives =
      kind === 'avatar'
        ? {
            ...base,
            avatar_small_url: variants.small ?? null,
            avatar_medium_url: variants.medium ?? null,
            avatar_large_url: variants.large ?? null,
          }
        : {
            ...base,
            banner_small_url: variants.small ?? null,
            banner_medium_url: variants.medium ?? null,
            banner_large_url: variants.large ?? null,
          };

    return new Store({ ...next, updated_at: new Date() });
  }

  /** Activa o desactiva los grupos de avisos por email de la tienda. */
  withNotificationEvents(events: Partial<StoreNotificationEvents>): Store {
    return new Store({
      ...this.toPrimitives(),
      notification_events: {
        ...this.notification_events,
        ...events,
      },
      updated_at: new Date(),
    });
  }

  /** Activa o desactiva el resumen diario de ventas. */
  withNotificationDigest(digest: boolean): Store {
    return new Store({
      ...this.toPrimitives(),
      notification_digest: digest,
      updated_at: new Date(),
    });
  }

  /** Cambia quién puede editar las fotos (solo lo usa el dueño). */
  withPhotoEditModes(modes: {
    avatar?: StorePhotoEditMode;
    banner?: StorePhotoEditMode;
  }): Store {
    return new Store({
      ...this.toPrimitives(),
      avatar_edit_mode: modes.avatar ?? this.avatar_edit_mode,
      banner_edit_mode: modes.banner ?? this.banner_edit_mode,
      updated_at: new Date(),
    });
  }
}
