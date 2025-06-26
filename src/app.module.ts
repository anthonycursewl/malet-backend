import { Module } from '@nestjs/common';
import { UserModule } from './context/users/user.module';
import { WalletModule } from './context/wallet/wallet.module';

@Module({
  imports: [UserModule, WalletModule],
})
export class AppModule {}
