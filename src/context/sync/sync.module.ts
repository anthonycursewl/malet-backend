import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { SyncController } from './infrastructure/adapters/controllers/sync.controller';
import { PushSyncService } from './application/use-cases/push-sync.service';
import { PullSyncService } from './application/use-cases/pull-sync.service';
import { PrismaSyncRepositoryAdapter } from './infrastructure/adapters/persistence/prisma-sync.repository.adapter';
import {
  PULL_SYNC_USECASE,
  PUSH_SYNC_USECASE,
} from './domain/ports/in/sync.usecase';
import { SYNC_REPOSITORY_PORT } from './domain/ports/out/sync.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [
    {
      provide: SYNC_REPOSITORY_PORT,
      useClass: PrismaSyncRepositoryAdapter,
    },
    {
      provide: PUSH_SYNC_USECASE,
      useClass: PushSyncService,
    },
    {
      provide: PULL_SYNC_USECASE,
      useClass: PullSyncService,
    },
  ],
})
export class SyncModule {}
