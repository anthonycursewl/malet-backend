import { Injectable, Inject } from '@nestjs/common';
import { GetHistoryTransactionUseCase } from '../domain/ports/in/get-history-transaction.usecase';
import {
  TRANSACTION_REPOSITORY_PORT,
  TransactionRepository,
} from '../domain/ports/out/transaction.repository';
import { Transaction } from '../domain/entities/transaction.entity';

@Injectable()
export class GetHistoryTransactionService implements GetHistoryTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(
    id: string,
    skip: number,
    take: number,
    type: string,
    user_id: string,
  ): Promise<Transaction[]> {
    return this.transactionRepository.getHistoryTransaction(
      id,
      skip,
      take,
      type,
      user_id,
    );
  }
}
