import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { SaveTransactionUseCase } from "../domain/ports/in/save-transaction.usecase";
import { Transaction, TransactionPrimitives } from "../domain/entities/transaction.entity";
import { TRANSACTION_REPOSITORY_PORT, TransactionRepository } from "../domain/ports/out/transaction.repository";
import { ACCOUNT_REPOSITORY_PORT, AccountRepository } from "../domain/ports/out/account.repository";

@Injectable()
export class SaveTransactionService implements SaveTransactionUseCase {
    constructor(
        @Inject(TRANSACTION_REPOSITORY_PORT)
        private readonly transactionRepository: TransactionRepository,
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository
    ) { }

    async execute(userId: string, tx: Omit<TransactionPrimitives, 'id' | 'issued_at'>): Promise<Transaction> {
        const account = await this.accountRepository.findById(tx.account_id);

        if (!account) {
            throw new Error('Cuenta no encontrada');
        }

        if (account.toPrimitives().user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para crear transacciones en esta cuenta');
        }

        const created = Transaction.create(tx)
        return this.transactionRepository.save(created)
    }
}