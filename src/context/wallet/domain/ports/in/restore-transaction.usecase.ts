import { Transaction } from '../../entities/transaction.entity';

export const RESTORE_TRANSACTION_USECASE = 'RESTORE_TRANSACTION_USECASE';

export interface RestoreTransactionUseCase {
  execute(userId: string, indexId: string): Promise<Transaction>;
}
