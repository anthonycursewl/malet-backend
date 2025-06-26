import { Transaction } from "../../entities/transaction.entity"
export const GET_HISTORY_TRANSACTION_USECASE = 'GET_HISTORY_TRANSACTION_USECASE'

export interface GetHistoryTransactionUseCase {
    execute(id: string, skip: number, take: number, type: string, user_id: string): Promise<Transaction[]>
}