import {
  Transaction,
  TransactionPrimitives,
} from '../../entities/transaction.entity';

export const SAVE_TRANSACTION_USECASE = 'SAVE_TRANSACTION_USECASE';

export interface SaveTransactionUseCase {
  execute(
    userId: string,
    tx: Omit<TransactionPrimitives, 'id' | 'issued_at'>,
  ): Promise<Transaction>;
}
