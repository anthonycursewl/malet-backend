import { Transaction } from '../../entities/transaction.entity';

export const COMPLETE_TRANSACTION_USECASE = 'COMPLETE_TRANSACTION_USECASE';

export interface CompleteTransactionUseCase {
    execute(id: string, newType: string): Promise<Transaction>;
}
