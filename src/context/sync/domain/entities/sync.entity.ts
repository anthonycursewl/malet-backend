export type SyncEntityType =
  | 'accounts'
  | 'transactions'
  | 'transaction_tag'
  | 'transaction_tag_assignment'
  | 'shared_accounts';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncOp {
  client_id: string;
  entity_type: SyncEntityType;
  operation: SyncOperation;
  payload: Record<string, any>;
  client_updated_at: string;
}

export interface AcceptedSyncResult {
  client_id: string;
  server_id: string;
  server_updated_at: string;
  entity_type: SyncEntityType;
}

export type RejectionReason =
  | 'validation_error'
  | 'version_conflict'
  | 'not_found'
  | 'already_deleted'
  | 'forbidden';

export interface RejectedSyncResult {
  client_id: string;
  reason: RejectionReason;
  conflict?: {
    server: Record<string, any>;
    client: Record<string, any>;
  };
}

export interface PushResponse {
  accepted: AcceptedSyncResult[];
  rejected: RejectedSyncResult[];
}

export interface PullItem {
  entity_type: SyncEntityType;
  server_id: string;
  payload: Record<string, any>;
  server_updated_at: string;
  deleted: boolean;
}

export interface PullResponse {
  items: PullItem[];
  server_clock: string;
  next_cursor: string | null;
}
