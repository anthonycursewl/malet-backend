export const CREDIT_TYPES = ['receivable', 'payable'] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

export const CREDIT_STATUSES = ['pending', 'settled'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const DEFAULT_LIST_TAKE = 10;
export const MAX_LIST_TAKE = 100;
