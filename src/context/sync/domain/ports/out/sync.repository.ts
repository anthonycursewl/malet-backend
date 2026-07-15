import { Prisma } from '@prisma/client';
import {
  AcceptedSyncResult,
  SyncEntityType,
  SyncOperation,
} from '../../entities/sync.entity';

export const SYNC_REPOSITORY_PORT = 'SYNC_REPOSITORY_PORT';

export interface CachedClientOp {
  clientId: string;
  result: AcceptedSyncResult;
}

export interface ServerRecordForConflict {
  id: string;
  user_id: string;
  updated_at: Date;
  deleted_at: Date | null;
  data: Record<string, any>;
}

export interface SyncRepository {
  findCachedOp(
    userId: string,
    clientId: string,
  ): Promise<CachedClientOp | null>;

  saveCachedOp(
    userId: string,
    clientId: string,
    entityType: SyncEntityType,
    result: AcceptedSyncResult,
    tx: Prisma.TransactionClient,
  ): Promise<void>;

  findByServerId(
    entity: SyncEntityType,
    userId: string,
    serverId: string,
  ): Promise<ServerRecordForConflict | null>;

  createRecord(
    entity: SyncEntityType,
    data: Record<string, any>,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; updated_at: Date; deleted_at: Date | null }>;

  updateRecord(
    entity: SyncEntityType,
    serverId: string,
    data: Record<string, any>,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; updated_at: Date; deleted_at: Date | null }>;

  softDeleteRecord(
    entity: SyncEntityType,
    serverId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; updated_at: Date; deleted_at: Date | null }>;

  pullChanges(
    entity: SyncEntityType,
    userId: string,
    cursorDate: Date,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      data: Record<string, any>;
      updated_at: Date;
      deleted_at: Date | null;
    }>
  >;

  applyOp(
    entity: SyncEntityType,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult>;
}
