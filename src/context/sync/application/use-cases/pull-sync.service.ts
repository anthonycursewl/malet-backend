import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PullSyncUseCase } from '../../domain/ports/in/sync.usecase';
import {
  SYNC_REPOSITORY_PORT,
  SyncRepository,
} from '../../domain/ports/out/sync.repository';
import {
  PullItem,
  PullResponse,
  SyncEntityType,
} from '../../domain/entities/sync.entity';
import { ALLOWED_SYNC_ENTITIES } from '../../infrastructure/adapters/dtos/sync-entity.types';

@Injectable()
export class PullSyncService implements PullSyncUseCase {
  private readonly MAX_LIMIT = 500;
  private readonly DEFAULT_LIMIT = 100;

  constructor(
    @Inject(SYNC_REPOSITORY_PORT)
    private readonly syncRepository: SyncRepository,
  ) {}

  async execute(
    userId: string,
    entity: SyncEntityType,
    cursor: string | undefined,
    limit: number,
  ): Promise<PullResponse> {
    if (!ALLOWED_SYNC_ENTITIES.includes(entity)) {
      throw new BadRequestException(`Unsupported entity: ${entity}`);
    }

    const safeLimit = Math.min(
      Math.max(1, limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT,
    );
    const cursorDate = cursor ? new Date(cursor) : new Date(0);

    if (cursor && Number.isNaN(cursorDate.getTime())) {
      throw new BadRequestException('Invalid cursor (must be ISO-8601)');
    }

    const records = await this.syncRepository.pullChanges(
      entity,
      userId,
      cursorDate,
      safeLimit,
    );

    const items: PullItem[] = records.map((r) => ({
      entity_type: entity,
      server_id: r.id,
      payload: r.data,
      server_updated_at: r.updated_at.toISOString(),
      deleted: r.deleted_at !== null,
    }));

    const next_cursor =
      items.length === safeLimit
        ? items[items.length - 1].server_updated_at
        : null;

    return {
      items,
      server_clock: new Date().toISOString(),
      next_cursor,
    };
  }
}
