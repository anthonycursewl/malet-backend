import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './context/users/user.module';
import { WalletModule } from './context/wallet/wallet.module';
import { CommunityModule } from './context/communities/community.module';
import { OnboardingModule } from './context/onboarding/onboarding.module';
import { FeedModule } from './context/feed/feed.module';
import { MessagingModule } from './context/messaging/messaging.module';
import { CommonModule } from './common/common.module';
import { DebugModule } from './debug/debug.module';
import { FileStorageModule } from './shared/infrastructure/file-storage/file-storage.module';
import { AuthorizationModule } from './shared/infrastructure/authorization/authorization.module';
import { EmailModule } from './shared/infrastructure/email/email.module';
import { GarzonModule } from './context/garzon/garzon.module';
import { AIChatModule } from './context/ai-chat/ai-chat.module';
import { IntegrationsModule } from './context/integrations/infrastructure/integrations.module';
import { BotBlockerMiddleware } from './shared/common/middleware/bot-blocker.middleware';
import { ThrottlerBehindProxyGuard } from './shared/common/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 120,
      },
    ]),
    CommonModule,
    FileStorageModule,
    EmailModule,
    AuthorizationModule,
    UserModule,
    WalletModule,
    CommunityModule,
    OnboardingModule,
    FeedModule,
    MessagingModule,
    DebugModule,
    GarzonModule,
    AIChatModule,
    IntegrationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BotBlockerMiddleware).forRoutes('*');
  }
}
