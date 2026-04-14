import { Transaction } from '../../entities/transaction.entity';

export const DELETE_TRANSACTION_USECASE = 'DELETE_TRANSACTION_USECASE';

export interface DeleteTransactionUseCase {
  // Returns the soft-deleted transaction entity (after marking deleted_at)
  execute(userId: string, indexId: string): Promise<Transaction>;
}
