import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  ) {}

  async execute(userId: string, id: string, newType: string): Promise<Transaction> {
    const tx = await this.transactionRepository.findById(id);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    const account = await this.accountRepository.findById(tx.getAccountId());
    if (!account || account.getUserId() !== userId) {
      throw new ForbiddenException('You do not own this transaction');
    }

    return this.transactionRepository.complete(id, newType);
  }
}
