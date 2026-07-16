import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './context/users/user.module';
import { WalletModule } from './context/wallet/wallet.module';
import { SharedAccountsModule } from './context/shared-accounts/shared-accounts.module';
import { CommonModule } from './shared/common/common.module';
import { DebugModule } from './debug/debug.module';
import { FileStorageModule } from './shared/infrastructure/file-storage/file-storage.module';
import { EmailModule } from './shared/infrastructure/email/email.module';
import { BotBlockerMiddleware } from './shared/common/middleware/bot-blocker.middleware';
import { ThrottlerBehindProxyGuard } from './shared/common/guards/throttler-behind-proxy.guard';
import { TagErrorLoggerFilter } from './common/filters/tag-error-logger.filter';
import { AuthorizationModule } from './shared/infrastructure/authorization/authorization.module';
import { GarzonModule } from './context/garzon/garzon.module';
import { SyncModule } from './context/sync/sync.module';
import { TaskitiModule } from './context/taskiti/taskiti.module';
import { UpdaterModule } from './context/updater/updater.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 60,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 120,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 300,
      },
    ]),
    CommonModule,
    FileStorageModule,
    EmailModule,
    AuthorizationModule,
    UserModule,
    WalletModule,
    SharedAccountsModule,
    DebugModule,
    GarzonModule,
    SyncModule,
    TaskitiModule,
    UpdaterModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_FILTER,
      useClass: TagErrorLoggerFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BotBlockerMiddleware).forRoutes('*');
  }
}
