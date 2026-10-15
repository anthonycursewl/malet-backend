import { randomUUID } from 'crypto';
import { CreditStatus, CreditType } from '../constants';

export interface CreditEntryPrimitives {
  id: string;
  user_id: string;
  type: CreditType;
  concept: string;
  party: string | null;
  amount: number;
  due_date: Date;
  account_id: string | null;
  status: CreditStatus;
  settled_at: Date | null;
  settled_transaction_id: string | null;
  settled_transaction_index: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class CreditEntry {
  private readonly id: string;
  private readonly user_id: string;
  private readonly type: CreditType;
  private readonly concept: string;
  private readonly party: string | null;
  private readonly amount: number;
  private readonly due_date: Date;
  private readonly account_id: string | null;
  private readonly status: CreditStatus;
  private readonly settled_at: Date | null;
  private readonly settled_transaction_id: string | null;
  private readonly settled_transaction_index: string | null;
  private readonly notes: string | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;
  private readonly deleted_at: Date | null;

  constructor(data: {
    id: string;
    user_id: string;
    type: CreditType;
    concept: string;
    party: string | null;
    amount: number;
    due_date: Date;
    account_id: string | null;
    status: CreditStatus;
    settled_at: Date | null;
    settled_transaction_id: string | null;
    settled_transaction_index: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.concept = data.concept;
    this.party = data.party;
    this.amount = data.amount;
    this.due_date = data.due_date;
    this.account_id = data.account_id;
    this.status = data.status;
    this.settled_at = data.settled_at;
    this.settled_transaction_id = data.settled_transaction_id;
    this.settled_transaction_index = data.settled_transaction_index;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.deleted_at = data.deleted_at;
  }

  static create(data: {
    user_id: string;
    type: CreditType;
    concept: string;
    party?: string | null;
    amount: number;
    due_date: Date;
    account_id?: string | null;
    notes?: string | null;
  }): CreditEntry {
    const now = new Date();
    return new CreditEntry({
      id: randomUUID(),
      user_id: data.user_id,
      type: data.type,
      concept: data.concept,
      party: data.party ?? null,
      amount: data.amount,
      due_date: data.due_date,
      account_id: data.account_id ?? null,
      status: 'pending',
      settled_at: null,
      settled_transaction_id: null,
      settled_transaction_index: null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  static fromPrimitives(primitives: CreditEntryPrimitives): CreditEntry {
    return new CreditEntry({
      id: primitives.id,
      user_id: primitives.user_id,
      type: primitives.type,
      concept: primitives.concept,
      party: primitives.party ?? null,
      amount: Number(primitives.amount),
      due_date: primitives.due_date,
      account_id: primitives.account_id ?? null,
      status: primitives.status,
      settled_at: primitives.settled_at ?? null,
      settled_transaction_id: primitives.settled_transaction_id ?? null,
      settled_transaction_index: primitives.settled_transaction_index ?? null,
      notes: primitives.notes ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at ?? null,
    });
  }

  toPrimitives(): CreditEntryPrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      type: this.type,
      concept: this.concept,
      party: this.party,
      amount: this.amount,
      due_date: this.due_date,
      account_id: this.account_id,
      status: this.status,
      settled_at: this.settled_at,
      settled_transaction_id: this.settled_transaction_id,
      settled_transaction_index: this.settled_transaction_index,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getType(): CreditType {
    return this.type;
  }

  getConcept(): string {
    return this.concept;
  }

  getParty(): string | null {
    return this.party;
  }

  getAmount(): number {
    return this.amount;
  }

  getDueDate(): Date {
    return this.due_date;
  }

  getAccountId(): string | null {
    return this.account_id;
  }

  getStatus(): CreditStatus {
    return this.status;
  }

  getSettledAt(): Date | null {
    return this.settled_at;
  }

  getSettledTransactionId(): string | null {
    return this.settled_transaction_id;
  }

  getSettledTransactionIndex(): string | null {
    return this.settled_transaction_index;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }

  getDeletedAt(): Date | null {
    return this.deleted_at;
  }

  isSettled(): boolean {
    return this.status === 'settled';
  }

  isDeleted(): boolean {
    return this.deleted_at != null;
  }

  update(
    data: Partial<
      Pick<
        CreditEntryPrimitives,
        | 'type'
        | 'concept'
        | 'party'
        | 'amount'
        | 'due_date'
        | 'account_id'
        | 'notes'
      >
    >,
  ): CreditEntry {
    return new CreditEntry({
      id: this.id,
      user_id: this.user_id,
      type: data.type !== undefined ? data.type : this.type,
      concept: data.concept !== undefined ? data.concept : this.concept,
      party: data.party !== undefined ? data.party : this.party,
      amount: data.amount !== undefined ? data.amount : this.amount,
      due_date: data.due_date !== undefined ? data.due_date : this.due_date,
      account_id:
        data.account_id !== undefined ? data.account_id : this.account_id,
      status: this.status,
      settled_at: this.settled_at,
      settled_transaction_id: this.settled_transaction_id,
      settled_transaction_index: this.settled_transaction_index,
      notes: data.notes !== undefined ? data.notes : this.notes,
      created_at: this.created_at,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
    });
  }

  markSettled(data: {
    settled_at: Date;
    transaction_id: string | null;
    transaction_index: string | null;
  }): CreditEntry {
    return new CreditEntry({
      ...this.toPrimitives(),
      amount: this.amount,
      status: 'settled',
      settled_at: data.settled_at,
      settled_transaction_id: data.transaction_id,
      settled_transaction_index: data.transaction_index,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
    });
  }

  markPending(): CreditEntry {
    return new CreditEntry({
      ...this.toPrimitives(),
      amount: this.amount,
      status: 'pending',
      settled_at: null,
      settled_transaction_id: null,
      settled_transaction_index: null,
      updated_at: new Date(),
      deleted_at: this.deleted_at,
    });
  }
}
