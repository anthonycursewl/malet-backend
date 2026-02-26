import { Injectable, Inject } from '@nestjs/common';
import {
  GetHistoryTransactionUseCase,
  HistoryTransactionOptions,
} from '../domain/ports/in/get-history-transaction.usecase';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from '../domain/ports/out/transaction.repository';
import { Transaction } from '../domain/entities/transaction.entity';

@Injectable()
export class GetHistoryTransactionService implements GetHistoryTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
  ) { }

  async execute(options: HistoryTransactionOptions): Promise<Transaction[]> {
    return this.transactionRepository.getHistoryTransaction(options);
  }
}


