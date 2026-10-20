export const NOTIFICATION_LOG_REPOSITORY_PORT = Symbol(
  'NOTIFICATION_LOG_REPOSITORY_PORT',
);

/** Resultado de un envío de aviso por email. */
export type NotificationLogStatus = 'sent' | 'failed' | 'skipped';

/** Datos del aviso que se guardan para poder reintentar un envío fallido. */
export interface NotificationLogPayload {
  subject: string;
  title: string;
  intro: string;
  rows?: { label: string; value: string }[];
  footerNote?: string;
  /** Quién provocó el evento (el correo añade "Registrado por"). */
  actor_id?: string | null;
}

export interface NotificationLogEntry {
  id: string;
  store_id: string;
  /** Evento notificado, p. ej. `sale_created` o `daily_digest`. */
  event: string;
  subject: string;
  /** Emails a los que se intentó enviar. */
  recipients: string[];
  /** Datos del aviso (permite reconstruirlo en un reintento). */
  payload?: NotificationLogPayload | null;
  /** Intentos realizados. */
  attempts: number;
  status: NotificationLogStatus;
  error?: string | null;
  created_at: Date;
}

/**
 * Auditoría de los avisos por email: deja constancia de qué se envió, a quién y
 * con qué resultado. Sirve para depurar, controlar el volumen (anti-flood) y
 * reintentar los envíos fallidos.
 */
export interface NotificationLogRepository {
  save(entry: NotificationLogEntry): Promise<void>;
  /** Envíos correctos de la tienda desde una fecha (control de volumen). */
  countSentSince(store_id: string, since: Date): Promise<number>;
  /** Fallidos reintentables: pocos intentos y con datos guardados. */
  findRetryable(
    since: Date,
    maxAttempts: number,
  ): Promise<NotificationLogEntry[]>;
  /** Registra el resultado de un reintento. */
  updateResult(
    id: string,
    status: NotificationLogStatus,
    error: string | null,
    attempts: number,
  ): Promise<void>;
}
