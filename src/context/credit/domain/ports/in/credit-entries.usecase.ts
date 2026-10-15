import { CreditEntry } from '../../entities/credit-entry.entity';
import { CreditStatus, CreditType } from '../../constants';
import { CreateCreditEntryDto } from '../../../application/dtos/create-credit-entry.dto';
import { UpdateCreditEntryDto } from '../../../application/dtos/update-credit-entry.dto';
import { CreditCalendarParams, CreditCalendarResult } from '../../types';

export const CREDIT_ENTRIES_USECASE = Symbol('CREDIT_ENTRIES_USECASE');

export interface ListCreditEntriesOptions {
  user_id: string;
  take: number;
  cursor?: string;
  type?: CreditType;
  status?: CreditStatus;
  account_id?: string;
}

export interface CreditEntriesUseCase {
  create(user_id: string, dto: CreateCreditEntryDto): Promise<CreditEntry>;
  list(options: ListCreditEntriesOptions): Promise<CreditEntry[]>;
  calendar(params: CreditCalendarParams): Promise<CreditCalendarResult>;
  getById(
    user_id: string,
    id: string,
    include_deleted?: boolean,
  ): Promise<CreditEntry>;
  update(
    user_id: string,
    id: string,
    dto: UpdateCreditEntryDto,
  ): Promise<CreditEntry>;
  /** Marks as paid/collected; moves the money in the assigned account when there is one. */
  settle(user_id: string, id: string): Promise<CreditEntry>;
  /** Back to pending: soft-deletes the wallet transaction (balance is reverted). */
  unsettle(user_id: string, id: string): Promise<CreditEntry>;
  softDelete(user_id: string, id: string): Promise<CreditEntry>;
  restore(user_id: string, id: string): Promise<CreditEntry>;
  hardDelete(user_id: string, id: string): Promise<void>;
}
