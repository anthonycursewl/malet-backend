export const TRANSACTION_TYPES = ['expense', 'saving', 'pending_payment'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ANALYTICS_DEFAULT_RANGE_DAYS = 30;

export const SORT_FIELDS = ['total', 'count', 'date', 'name'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
