import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AgentController } from './controllers/agent.controller';
import { AgentService } from './services/agent.service';
import { SimpleModelAdapter } from './adapters/simple-model.adapter';
import { RedisMemoryService } from './adapters/redis-memory.service';
import { ToolRunnerService } from './services/tool-runner.service';
import { TRANSACTION_REPOSITORY_PORT } from 'src/context/wallet/domain/ports/out/transaction.repository';
import { TransactionRepositoryAdapter } from 'src/context/wallet/infrastructure/persistence/transaction.repositoy.adapter';
import { ACCOUNT_REPOSITORY_PORT } from 'src/context/wallet/domain/ports/out/account.repository';
import { AccountRepositoryAdapter } from 'src/context/wallet/infrastructure/persistence/account.repository.adapter';
import { SAVE_TRANSACTION_USECASE } from 'src/context/wallet/domain/ports/in/save-transaction.usecase';
import { SaveTransactionService } from 'src/context/wallet/application/save-transaction.service';
import { TRANSACTION_TAG_REPOSITORY_PORT } from 'src/context/wallet/domain/ports/out/transaction-tag.repository';
import { TransactionTagRepositoryAdapter } from 'src/context/wallet/infrastructure/persistence/transaction-tag.repository.adapter';
import { SnowflakeService } from 'src/shared/infrastructure/services/snowflake-id.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    { provide: 'MODEL_CLIENT', useClass: SimpleModelAdapter },
    { provide: 'MEMORY_SERVICE', useClass: RedisMemoryService },
    { provide: 'TOOL_RUNNER', useClass: ToolRunnerService },

    // wire minimal wallet dependencies used by tools
    {
      provide: TRANSACTION_REPOSITORY_PORT,
      useClass: TransactionRepositoryAdapter,
    },
    { provide: ACCOUNT_REPOSITORY_PORT, useClass: AccountRepositoryAdapter },
    { provide: SAVE_TRANSACTION_USECASE, useClass: SaveTransactionService },
    {
      provide: TRANSACTION_TAG_REPOSITORY_PORT,
      useClass: TransactionTagRepositoryAdapter,
    },
    SnowflakeService,

    SimpleModelAdapter,
    RedisMemoryService,
    ToolRunnerService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
