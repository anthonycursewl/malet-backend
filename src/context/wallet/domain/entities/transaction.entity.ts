import { SnowflakeService } from 'src/shared/infrastructure/services/snowflake-id.service';
import { TransactionTag, TransactionTagPrimitives } from './transaction-tag.entity';

export interface TransactionPrimitives {
  id: string;
  index_id?: string;
  name: string;
  amount: number;
  type: string;
  account_id: string;
  issued_at: Date;
  currency_code?: string;
  tags?: TransactionTagPrimitives[];
}

/**
 * Genera un identificador único personalizado
 * Compatible con entornos donde crypto.randomUUID() no está disponible
 */
function generateCustomId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  const counter = Math.floor(Math.random() * 1000).toString(36);
  return `${timestamp}-${randomPart}-${counter}`;
}

export class Transaction {
  private readonly id: string;
  private readonly index_id?: bigint;
  private readonly name: string;
  private readonly amount: number;
  private readonly type: string;
  private readonly account_id: string;
  private readonly issued_at: Date;
  private readonly currency_code?: string;
  private readonly tags: TransactionTag[];

  constructor(
    id: string,
    index_id: bigint,
    name: string,
    amount: number,
    type: string,
    account_id: string,
    issued_at: Date,
    currency_code?: string,
    tags?: TransactionTag[],
  ) {
    this.id = id;
    this.index_id = index_id;
    this.name = name;
    this.amount = amount;
    this.type = type;
    this.account_id = account_id;
    this.issued_at = issued_at;
    this.currency_code = currency_code;
    this.tags = tags || [];
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getAmount() {
    return this.amount;
  }

  getType() {
    return this.type;
  }

  getAccountId() {
    return this.account_id;
  }

  getIssuedAt() {
    return this.issued_at;
  }

  getCurrencyCode() {
    return this.currency_code;
  }

  getTags() {
    return this.tags;
  }

  getIndexId() {
    return this.index_id;
  }

  toPrimitives(): TransactionPrimitives {
    return {
      id: this.id,
      index_id: this.index_id ? this.index_id.toString() : undefined,
      name: this.name,
      amount: this.amount,
      type: this.type,
      account_id: this.account_id,
      issued_at: this.issued_at,
      currency_code: this.currency_code,
      tags: this.tags.map((tag) => tag.toPrimitives()),
    };
  }

  static fromPrimitives(primitives: TransactionPrimitives): Transaction {
    return new Transaction(
      primitives.id,
      primitives.index_id ? BigInt(primitives.index_id) : undefined,
      primitives.name,
      primitives.amount,
      primitives.type,
      primitives.account_id,
      primitives.issued_at,
      primitives.currency_code,
      primitives.tags?.map((tag) => TransactionTag.fromPrimitives(tag)),
    );
  }

  static create(
    transaction: Omit<TransactionPrimitives, 'id' | 'issued_at'>,
  ): Transaction {
    return new Transaction(
      'M-' + generateCustomId(),
      transaction.index_id ? BigInt(transaction.index_id) : undefined,
      transaction.name,
      transaction.amount,
      transaction.type,
      transaction.account_id,
      new Date(),
      transaction.currency_code,
      transaction.tags?.map((tag) => TransactionTag.fromPrimitives(tag)),
    );
  }
}
