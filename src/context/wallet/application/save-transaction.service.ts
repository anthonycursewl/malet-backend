import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { SaveTransactionUseCase } from '../domain/ports/in/save-transaction.usecase';
import {
  Transaction,
  TransactionPrimitives,
} from '../domain/entities/transaction.entity';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from '../domain/ports/out/transaction.repository';
import {
  ACCOUNT_REPOSITORY_PORT,
  AccountRepository,
} from '../domain/ports/out/account.repository';
import {
  TRANSACTION_TAG_REPOSITORY_PORT,
  TransactionTagRepository,
} from '../domain/ports/out/transaction-tag.repository';
import { SnowflakeService } from 'src/shared/infrastructure/services/snowflake-id.service';

export interface TransactionWithTags extends Omit<
  TransactionPrimitives,
  'id' | 'issued_at'
> {
  tag_ids?: string[];
}

@Injectable()
export class SaveTransactionService implements SaveTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ACCOUNT_REPOSITORY_PORT)
    private readonly accountRepository: AccountRepository,
    @Inject(TRANSACTION_TAG_REPOSITORY_PORT)
    private readonly tagRepository: TransactionTagRepository,
    private readonly snowflakeService: SnowflakeService,
  ) { }

  async execute(userId: string, tx: TransactionWithTags): Promise<Transaction> {
    const account = await this.accountRepository.findById(tx.account_id);

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    if (account.toPrimitives().user_id !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para crear transacciones en esta cuenta',
      );
    }

    const tagIds = tx.tag_ids || [];
    delete (tx as any).tag_ids;

    const index_id = this.snowflakeService.generate();
    const created = Transaction.create({ ...tx, index_id });
    const saved = await this.transactionRepository.save(created);

    if (tagIds.length > 0) {
      await this.tagRepository.assignToTransaction(saved.getId(), tagIds);
    }

    return saved;
  }
}
