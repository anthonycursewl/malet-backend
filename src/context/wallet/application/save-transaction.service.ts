import { Inject, Injectable } from "@nestjs/common";
import { SaveTransactionUseCase } from "../domain/ports/in/save-transaction.usecase";
import { Transaction, TransactionPrimitives } from "../domain/entities/transaction.entity";
import { TRANSACTION_REPOSITORY_PORT, TransactionRepository } from "../domain/ports/out/transaction.repository";

@Injectable()
export class SaveTransactionService implements SaveTransactionUseCase {
    constructor(
        @Inject(TRANSACTION_REPOSITORY_PORT)
        private readonly transactionRepository: TransactionRepository
    ) {}

    async execute(tx: Omit<TransactionPrimitives, 'id' | 'issued_at'>): Promise<Transaction> {
        const created = Transaction.create(tx)
        return this.transactionRepository.save(created)
    }
}