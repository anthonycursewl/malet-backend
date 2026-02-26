import { Transaction } from '../../entities/transaction.entity';
export const GET_HISTORY_TRANSACTION_USECASE =
  'GET_HISTORY_TRANSACTION_USECASE';

export interface HistoryTransactionOptions {
  id: string;
  take: number;
  type: 'by_account_id' | 'by_user_id';
  user_id: string;
  cursor?: string;
  transactionTypes?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface GetHistoryTransactionUseCase {
  execute(options: HistoryTransactionOptions): Promise<Transaction[]>;
}


