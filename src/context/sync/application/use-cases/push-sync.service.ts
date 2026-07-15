import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PushSyncUseCase } from '../../domain/ports/in/sync.usecase';
import {
  SYNC_REPOSITORY_PORT,
  SyncRepository,
} from '../../domain/ports/out/sync.repository';
import {
  AcceptedSyncResult,
  PushResponse,
  RejectedSyncResult,
  SyncEntityType,
  SyncOp,
} from '../../domain/entities/sync.entity';
import { ALLOWED_SYNC_ENTITIES } from '../../infrastructure/adapters/dtos/sync-entity.types';

@Injectable()
export class PushSyncService implements PushSyncUseCase {
  constructor(
    @Inject(SYNC_REPOSITORY_PORT)
    private readonly syncRepository: SyncRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, ops: SyncOp[]): Promise<PushResponse> {
    if (!Array.isArray(ops) || ops.length === 0) {
      throw new BadRequestException('ops must be a non-empty array');
    }

    const accepted: AcceptedSyncResult[] = [];
    const rejected: RejectedSyncResult[] = [];

    for (const op of ops) {
      if (!op || !op.client_id || !op.entity_type || !op.operation) {
        rejected.push({
          client_id: op?.client_id ?? 'unknown',
          reason: 'validation_error',
        });
        continue;
      }

      if (!ALLOWED_SYNC_ENTITIES.includes(op.entity_type as SyncEntityType)) {
        rejected.push({
          client_id: op.client_id,
          reason: 'validation_error',
        });
        continue;
      }

      const cached = await this.syncRepository.findCachedOp(
        userId,
        op.client_id,
      );
      if (cached) {
        accepted.push(cached.result);
        continue;
      }

      const result = await this.applyOp(userId, op);
      if (result.kind === 'accepted') {
        accepted.push(result.value);
      } else {
        rejected.push(result.value);
      }
    }

    return { accepted, rejected };
  }

  private async applyOp(
    userId: string,
    op: SyncOp,
  ): Promise<
    | { kind: 'accepted'; value: AcceptedSyncResult }
    | { kind: 'rejected'; value: RejectedSyncResult }
  > {
    try {
      if (op.operation === 'create') {
        const data = { ...op.payload };
        delete data.id;
        delete data.server_id;
        delete data.user_id;
        delete data.client_updated_at;

        const result = await this.syncRepository.applyOp(
          op.entity_type,
          'create',
          userId,
          data,
        );

        await this.prisma.client_ops.create({
          data: {
            user_id: userId,
            client_id: op.client_id,
            entity_type: op.entity_type,
            result: result as any,
          },
        });

        return {
          kind: 'accepted',
          value: result,
        };
      }

      const serverId = op.payload?.id ?? op.payload?.server_id;
      if (!serverId) {
        return {
          kind: 'rejected',
          value: {
            client_id: op.client_id,
            reason: 'validation_error',
          },
        };
      }

      const server = await this.syncRepository.findByServerId(
        op.entity_type,
        userId,
        serverId,
      );

      if (!server) {
        return {
          kind: 'rejected',
          value: {
            client_id: op.client_id,
            reason: 'not_found',
          },
        };
      }

      if (server.user_id !== userId) {
        return {
          kind: 'rejected',
          value: {
            client_id: op.client_id,
            reason: 'forbidden',
          },
        };
      }

      if (op.operation === 'delete' && server.deleted_at) {
        return {
          kind: 'rejected',
          value: {
            client_id: op.client_id,
            reason: 'already_deleted',
          },
        };
      }

      const clientTs = new Date(op.client_updated_at);
      if (!Number.isNaN(clientTs.getTime()) && server.updated_at > clientTs) {
        return {
          kind: 'rejected',
          value: {
            client_id: op.client_id,
            reason: 'version_conflict',
            conflict: {
              server: { id: server.id, ...server.data },
              client: op.payload,
            },
          },
        };
      }

      const result = await this.syncRepository.applyOp(
        op.entity_type,
        op.operation,
        userId,
        { ...op.payload, id: serverId },
      );

      await this.prisma.client_ops.create({
        data: {
          user_id: userId,
          client_id: op.client_id,
          entity_type: op.entity_type,
          result: result as any,
        },
      });

      return { kind: 'accepted', value: result };
    } catch (_err) {
      return {
        kind: 'rejected',
        value: {
          client_id: op.client_id,
          reason: 'validation_error',
        },
      };
    }
  }
}
