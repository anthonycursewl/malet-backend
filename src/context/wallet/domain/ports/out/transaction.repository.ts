import { Transaction } from '../../entities/transaction.entity';

import { HistoryTransactionOptions } from '../in/get-history-transaction.usecase';

export const TRANSACTION_REPOSITORY_PORT = 'TRANSACTION_REPOSITORY_PORT';

export interface TransactionRepository {
  save(tx: Transaction): Promise<Transaction>;
  getHistoryTransaction(
    options: HistoryTransactionOptions,
  ): Promise<Transaction[]>;
  complete(id: string, newType: string): Promise<Transaction>;
}


