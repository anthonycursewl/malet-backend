import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DeleteTransactionUseCase } from '../domain/ports/in/delete-transaction.usecase';
import { Transaction } from '../domain/entities/transaction.entity';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from '../domain/ports/out/transaction.repository';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from '../domain/ports/out/account.repository';

@Injectable()
export class DeleteTransactionService implements DeleteTransactionUseCase {
  private readonly logger = new Logger(DeleteTransactionService.name);
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(userId: string, indexId: string): Promise<Transaction> {
    try {
      const tx = await this.transactionRepository.findByIndexId(indexId);
      if (!tx) throw new NotFoundException('Transaction not found');

      const account = await this.accountRepository.findById(tx.getAccountId());
      if (!account || account.getUserId() !== userId) {
        throw new ForbiddenException(
          'No permission to delete this transaction',
        );
      }

      const deleted = await this.transactionRepository.delete(tx.getId());
      this.logger.log(
        `Transaction ${tx.getId()} (index ${indexId}) soft-deleted by user ${userId}`,
      );

      if (!deleted) throw new Error('Failed to soft-delete transaction');
      return deleted;
    } catch (e) {
      this.logger.error(
        `Failed to delete transaction index ${indexId}: ${e.message}`,
      );
      throw e;
    }
  }
}
