import { Transaction } from '../../entities/transaction.entity';

export const SAVE_TRANSACTION_USECASE = 'SAVE_TRANSACTION_USECASE';

export interface SaveTransactionData {
  name: string;
  amount: number;
  account_id: string;
  type?: string;
  currency_code?: string;
  index_id?: string;
  tag_ids?: string[];
}

export interface SaveTransactionUseCase {
  execute(userId: string, tx: SaveTransactionData): Promise<Transaction>;
}
