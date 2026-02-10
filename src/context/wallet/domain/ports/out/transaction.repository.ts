import { Transaction } from '../../entities/transaction.entity';

export const TRANSACTION_REPOSITORY_PORT = 'TRANSACTION_REPOSITORY_PORT';

export interface TransactionRepository {
  save(tx: Transaction): Promise<Transaction>;
  getHistoryTransaction(
    id: string,
    skip: number,
    take: number,
    type: string,
    user_id: string,
  ): Promise<Transaction[]>;
}
