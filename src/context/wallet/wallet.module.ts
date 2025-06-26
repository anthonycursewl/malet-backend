import { Module } from "@nestjs/common";
import { AccountsController } from "./infrastructure/adapters/controllers/accounts.controller";
import { TransactionController } from "./infrastructure/adapters/controllers/transaction.controller";
import { CreateAccountService } from "./application/create-account.service";
import { SaveTransactionService } from "./application/save-transaction.service";
import { CREATE_ACCOUNT_USECASE } from "./domain/ports/in/create-account.usecase";
import { SAVE_TRANSACTION_USECASE } from "./domain/ports/in/save-transaction.usecase";
import { TRANSACTION_REPOSITORY_PORT } from "./domain/ports/out/transaction.repository";
import { TransactionRepositoryAdapter } from "./infrastructure/persistence/transaction.repositoy.adapter";
import { AccountRepositoryAdapter } from "./infrastructure/persistence/account.repository.adapter";
import { ACCOUNT_REPOSITORY_PORT } from "./domain/ports/out/account.repository";
import { PrismaModule } from "src/prisma.module";
import { GET_ALL_ACCOUNTS_USECASE } from "./domain/ports/in/get-all-acounts.usecase";
import { GetAllAccountsService } from "./application/get-all-accounts.service";
import { GET_HISTORY_TRANSACTION_USECASE } from "./domain/ports/in/get-history-transaction.usecase";
import { GetHistoryTransactionService } from "./application/get-history-transaction.service";

@Module({
    imports: [PrismaModule],
    controllers: [
        AccountsController, 
        TransactionController
    ],
    providers: [
        {
            provide: CREATE_ACCOUNT_USECASE,
            useClass: CreateAccountService
        }, 
        {
            provide: SAVE_TRANSACTION_USECASE,
            useClass: SaveTransactionService
        },
        {
            provide: TRANSACTION_REPOSITORY_PORT,
            useClass: TransactionRepositoryAdapter
        },
        {
            provide: ACCOUNT_REPOSITORY_PORT,
            useClass: AccountRepositoryAdapter
        },
        {
            provide: GET_ALL_ACCOUNTS_USECASE,
            useClass: GetAllAccountsService
        },
        {
            provide: GET_HISTORY_TRANSACTION_USECASE,
            useClass: GetHistoryTransactionService
        }
    ],
    exports: []
})
export class WalletModule {}