import { Module } from '@nestjs/common';
import { UserModule } from './context/users/user.module';
import { WalletModule } from './context/wallet/wallet.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    UserModule, 
    WalletModule
  ],
})
export class AppModule {}
