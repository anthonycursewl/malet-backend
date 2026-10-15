import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { CreditController } from './infrastructure/adapters/controllers/credit.controller';
import { CREDIT_ENTRY_REPOSITORY_PORT } from './domain/ports/out/credit-entry.repository';
import { CREDIT_ENTRIES_USECASE } from './domain/ports/in/credit-entries.usecase';
import { CreditEntryRepositoryAdapter } from './infrastructure/persistence/credit-entry.repository.adapter';
import { CreditEntriesService } from './application/credit-entries.service';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [CreditController],
  providers: [
    {
      provide: CREDIT_ENTRY_REPOSITORY_PORT,
      useClass: CreditEntryRepositoryAdapter,
    },
    {
      provide: CREDIT_ENTRIES_USECASE,
      useClass: CreditEntriesService,
    },
  ],
  exports: [CREDIT_ENTRIES_USECASE],
})
export class CreditModule {}
