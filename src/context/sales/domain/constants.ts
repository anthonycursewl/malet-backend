export const DATE_PRESETS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'last_7_days',
  'last_30_days',
  'this_year',
] as const;

export const SALE_SERIES_PERIODS = ['day', 'week', 'month'] as const;

/** Currencies allowed for a store: every amount of the store is expressed in this one. */
export const STORE_CURRENCIES = ['Bs', 'USD', 'COP'] as const;
export type StoreCurrency = (typeof STORE_CURRENCIES)[number];

/**
 * Política de recibos de la tienda:
 * - `ask`: se pregunta en cada venta (comportamiento por defecto).
 * - `always`: siempre se emite recibo (bloqueado).
 * - `never`: nunca se emite recibo (bloqueado).
 */
export const STORE_RECEIPT_MODES = ['ask', 'always', 'never'] as const;
export type StoreReceiptMode = (typeof STORE_RECEIPT_MODES)[number];

/**
 * Quién puede cambiar las fotos de la tienda:
 * - `owner`: solo el dueño.
 * - `members`: cualquier miembro activo.
 */
export const STORE_PHOTO_EDIT_MODES = ['owner', 'members'] as const;
export type StorePhotoEditMode = (typeof STORE_PHOTO_EDIT_MODES)[number];

export const DEFAULT_LIST_TAKE = 10;
export const MAX_LIST_TAKE = 100;

/**
 * Avisos por email de la tienda.
 *
 * El dueño elige **a qué miembros** llegan (flag `notify` del miembro) y **qué
 * grupos** de eventos se avisan (JSON en la tienda).
 */
export const NOTIFICATION_GROUPS = [
  'sales',
  'receipts',
  'store',
  'members',
] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

/** Todos los grupos apagados hasta que el dueño los active. */
export const DEFAULT_NOTIFICATION_EVENTS: Record<NotificationGroup, boolean> = {
  sales: false,
  receipts: false,
  store: false,
  members: false,
};

/** Evento concreto que puede generar un aviso. */
export type StoreNotificationEvent =
  | 'sale_created'
  | 'sale_updated'
  | 'sale_deleted'
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_cancelled'
  | 'receipt_issued'
  | 'receipt_updated'
  | 'receipt_deleted'
  | 'store_updated'
  | 'member_added'
  | 'member_removed';

/** Grupo al que pertenece cada evento (define si se avisa o no). */
export const EVENT_GROUP: Record<StoreNotificationEvent, NotificationGroup> = {
  sale_created: 'sales',
  sale_updated: 'sales',
  sale_deleted: 'sales',
  // Las facturas son parte del flujo de ventas del cuaderno.
  invoice_created: 'sales',
  invoice_paid: 'sales',
  invoice_cancelled: 'sales',
  receipt_issued: 'receipts',
  receipt_updated: 'receipts',
  receipt_deleted: 'receipts',
  store_updated: 'store',
  member_added: 'members',
  member_removed: 'members',
};

/** QR invitation tokens live this long (short like WhatsApp Web codes). */
export const STORE_INVITE_TTL_MS = 60_000;

/**
 * Receipt folio: `R-BRD-{year}-{000001}`.
 * `BRD` identifies Breadriuss, the infrastructure that runs Malet; the number is
 * a global yearly sequence shared by every store.
 */
export const RECEIPT_PREFIX = 'R';
export const RECEIPT_ISSUER_CODE = 'BRD';
/** Digits used for the sequence part of the folio. */
export const RECEIPT_SEQUENCE_PADDING = 6;

/**
 * Invoice folio: `F-BRD-{year}-{000001}`. Invoices are documents created
 * **before** payment; the receipt (`R-...`) is only issued when they are paid.
 */
export const INVOICE_PREFIX = 'F';
export const INVOICE_SEQUENCE_PADDING = 6;

/** Invoice lifecycle: pending → paid (or cancelled). */
export const INVOICE_STATUSES = ['pending', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** A sale line can be a catalog product or a free service concept. */
export const SALE_ITEM_TYPES = ['product', 'service'] as const;
export type SaleItemType = (typeof SALE_ITEM_TYPES)[number];
