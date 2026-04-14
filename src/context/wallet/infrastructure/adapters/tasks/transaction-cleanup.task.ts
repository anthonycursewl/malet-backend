import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from 'src/context/wallet/domain/ports/out/transaction.repository';

@Injectable()
export class TransactionCleanupTask {
  private readonly logger = new Logger(TransactionCleanupTask.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Starting transaction cleanup task...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const txsToDelete =
      await this.transactionRepository.findDeletedOlderThan(thirtyDaysAgo);

    this.logger.log(
      `Found ${txsToDelete.length} transactions to permanently delete.`,
    );

    for (const tx of txsToDelete) {
      try {
        await this.transactionRepository.deleteHard(tx.getId());
        this.logger.log(`Permanently deleted transaction: ${tx.getId()}`);
      } catch (error) {
        this.logger.error(
          `Failed to permanently delete transaction ${tx.getId()}: ${error.message}`,
        );
      }
    }

    this.logger.log('Transaction cleanup task finished.');
  }
}
