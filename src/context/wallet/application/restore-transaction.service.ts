import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { RestoreTransactionUseCase } from '../domain/ports/in/restore-transaction.usecase';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from '../domain/ports/out/transaction.repository';

@Injectable()
export class RestoreTransactionService implements RestoreTransactionUseCase {
  private readonly logger = new Logger(RestoreTransactionService.name);
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
  ) { }

  async execute(userId: string, indexId: string) {
    const restored = await this.transactionRepository.restore(indexId, userId);
    if (!restored) throw new NotFoundException('Transaction not found or permission denied');

    this.logger.log(`Transaction ${restored.getId()} restored by user ${userId}`);
    return restored;
  }
}
