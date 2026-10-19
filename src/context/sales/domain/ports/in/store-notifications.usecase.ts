import { NotificationGroup, StoreNotificationEvent } from '../../constants';
import { UpdateStoreNotificationsDto } from '../../../application/dtos/update-store-notifications.dto';

export const STORE_NOTIFICATIONS_USECASE = Symbol(
  'STORE_NOTIFICATIONS_USECASE',
);

/** Miembro con su email y si recibe avisos (solo lo ve el dueño). */
export interface StoreNotificationMember {
  user_id: string;
  name: string | null;
  /** Foto de perfil: identifica al miembro de un vistazo. */
  avatar_url: string | null;
  email: string;
  notify: boolean;
}

/** Configuración de avisos por email de una tienda. */
export interface StoreNotificationsConfig {
  events: Record<NotificationGroup, boolean>;
  /** Resumen diario de las ventas del día. */
  digest: boolean;
  members: StoreNotificationMember[];
}

/**
 * Contenido del aviso. Lo arma quien dispara el evento (ventas, recibos, tienda
 * o miembros) para que el correo explique qué pasó y con qué datos.
 */
export interface StoreNotificationPayload {
  subject: string;
  title: string;
  intro: string;
  rows?: { label: string; value: string }[];
  footerNote?: string;
  /** Quién provocó el evento: el correo añade "Registrado por". */
  actor_id?: string | null;
}

export interface StoreNotificationsUseCase {
  /** Configuración actual: **solo el dueño** (incluye los emails de los miembros). */
  getConfig(
    store_id: string,
    user_id: string,
  ): Promise<StoreNotificationsConfig>;
  /** Guarda la configuración: **solo el dueño**. */
  updateConfig(
    store_id: string,
    user_id: string,
    dto: UpdateStoreNotificationsDto,
  ): Promise<StoreNotificationsConfig>;
  /**
   * Avisa por email a los miembros seleccionados. **Nunca lanza**: si el SMTP
   * falla se registra en el log y la acción de negocio sigue su curso.
   */
  notify(
    store_id: string,
    event: StoreNotificationEvent,
    payload: StoreNotificationPayload,
  ): Promise<void>;

  /** Resumen diario de ventas de todas las tiendas que lo tengan activado. */
  sendDailyDigest(): Promise<void>;
  /** Reintenta los avisos que fallaron (máximo 3 intentos). */
  retryFailed(): Promise<void>;
}
