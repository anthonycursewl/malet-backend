import { CreditEntry } from '../../entities/credit-entry.entity';
import { CreditStatus, CreditType } from '../../constants';

export const CREDIT_ENTRY_REPOSITORY_PORT = Symbol(
  'CREDIT_ENTRY_REPOSITORY_PORT',
);

export interface ListCreditEntriesOptions {
  user_id: string;
  take: number;
  cursor?: string;
  type?: CreditType;
  status?: CreditStatus;
  account_id?: string;
}

export interface MonthCreditEntriesOptions {
  user_id: string;
  from: Date;
  to: Date;
  type?: CreditType;
  status?: CreditStatus;
  account_id?: string;
}

export interface CreditEntryRepository {
  save(entry: CreditEntry): Promise<CreditEntry>;
  findById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<CreditEntry | null>;
  findMany(options: ListCreditEntriesOptions): Promise<CreditEntry[]>;
  /** All entries whose due_date falls in the given [from, to) range. */
  findMonth(options: MonthCreditEntriesOptions): Promise<CreditEntry[]>;
  update(entry: CreditEntry): Promise<CreditEntry>;
  delete(id: string): Promise<CreditEntry>;
  restore(id: string): Promise<CreditEntry>;
  hardDelete(id: string): Promise<void>;
}
