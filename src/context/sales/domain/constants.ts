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

export const DEFAULT_LIST_TAKE = 10;
export const MAX_LIST_TAKE = 100;

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
