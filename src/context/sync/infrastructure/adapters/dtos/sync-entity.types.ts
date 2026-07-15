import { SyncEntityType } from '../../../domain/entities/sync.entity';

export const ALLOWED_SYNC_ENTITIES: SyncEntityType[] = [
  'accounts',
  'transactions',
  'transaction_tag',
  'transaction_tag_assignment',
  'shared_accounts',
];
