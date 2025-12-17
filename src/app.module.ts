import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
    GarzonModule
  ],
})
export class AppModule { }



