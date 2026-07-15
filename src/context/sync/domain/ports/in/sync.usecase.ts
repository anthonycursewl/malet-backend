import {
  PushResponse,
  PullResponse,
  SyncEntityType,
} from '../../entities/sync.entity';

export const PUSH_SYNC_USECASE = 'PUSH_SYNC_USECASE';
export const PULL_SYNC_USECASE = 'PULL_SYNC_USECASE';

export interface PushSyncUseCase {
  execute(userId: string, ops: any[]): Promise<PushResponse>;
}

export interface PullSyncUseCase {
  execute(
    userId: string,
    entity: SyncEntityType,
    cursor: string | undefined,
    limit: number,
  ): Promise<PullResponse>;
}
