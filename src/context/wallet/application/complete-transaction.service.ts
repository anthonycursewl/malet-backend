import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { CompleteTransactionUseCase } from '../domain/ports/in/complete-transaction.usecase';
import {
    TRANSACTION_REPOSITORY_PORT,
    TransactionRepository,
} from '../domain/ports/out/transaction.repository';
import {
    ACCOUNT_REPOSITORY_PORT,
    AccountRepository,
} from '../domain/ports/out/account.repository';
import { Transaction } from '../domain/entities/transaction.entity';

@Injectable()
export class CompleteTransactionService implements CompleteTransactionUseCase {
    constructor(
        @Inject(TRANSACTION_REPOSITORY_PORT)
        private readonly transactionRepository: TransactionRepository,
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository,
    ) { }

    async execute(id: string, newType: string): Promise<Transaction> {
        return this.transactionRepository.complete(id, newType);
    }
}
