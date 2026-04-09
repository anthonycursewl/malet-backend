export interface CreateTagParams {
  name: string;
  color?: string;
  userId: string;
  available_colors?: string[];
  palette?: string[];
}

export interface UpdateTagParams {
  id: string;
  name?: string;
  color?: string;
  userId: string;
}

export interface AssignTagsParams {
  transactionId: string;
  tagIds: string[];
  userId: string;
}

export interface TRANSACTION_TAG_USE_CASE_PORT {
  createTag(
    params: CreateTagParams,
  ): Promise<import('../../entities/transaction-tag.entity').TransactionTag>;
  updateTag(
    params: UpdateTagParams,
  ): Promise<import('../../entities/transaction-tag.entity').TransactionTag>;
  deleteTag(id: string, userId: string): Promise<void>;
  getUserTags(
    userId: string,
  ): Promise<import('../../entities/transaction-tag.entity').TransactionTag[]>;
  getTagById(
    id: string,
    userId: string,
  ): Promise<
    import('../../entities/transaction-tag.entity').TransactionTag | null
  >;
  assignTagsToTransaction(params: AssignTagsParams): Promise<void>;
  removeTagFromTransaction(
    transactionId: string,
    tagId: string,
    userId: string,
  ): Promise<void>;
  getTransactionTags(
    transactionId: string,
    userId: string,
  ): Promise<import('../../entities/transaction-tag.entity').TransactionTag[]>;
}
