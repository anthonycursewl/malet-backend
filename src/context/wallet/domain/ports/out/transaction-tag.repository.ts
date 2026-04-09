import { TransactionTag } from '../../entities/transaction-tag.entity';

export const TRANSACTION_TAG_REPOSITORY_PORT =
  'TRANSACTION_TAG_REPOSITORY_PORT';

export interface TransactionTagRepository {
  save(tag: TransactionTag): Promise<TransactionTag>;
  findById(id: string): Promise<TransactionTag | null>;
  findBySlug(userId: string, slug: string): Promise<TransactionTag | null>;
  findByUserId(userId: string): Promise<TransactionTag[]>;
  delete(id: string): Promise<void>;
  assignToTransaction(transactionId: string, tagIds: string[]): Promise<void>;
  removeFromTransaction(transactionId: string, tagId: string): Promise<void>;
  findByTransactionId(transactionId: string): Promise<TransactionTag[]>;
}
