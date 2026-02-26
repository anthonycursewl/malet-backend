import { Account } from '../../entities/account.entity';
import { UpdateAccount } from '../in/update-account.usecase';

export const ACCOUNT_REPOSITORY_PORT = 'ACCOUNT_REPOSITORY_PORT';

export interface AccountRepository {
  create(account: Account): Promise<Account>;
  getAllAccounts(userId: string, take: number, cursor?: string): Promise<Account[] | []>;
  findById(accountId: string, includeDeleted?: boolean): Promise<Account | null>;

  update(accountId: string, updateAccountDto: UpdateAccount): Promise<Account>;
  softDelete(accountId: string): Promise<void>;
  restore(accountId: string): Promise<void>;
  findDeletedOlderThan(date: Date): Promise<Account[]>;
  getDeletedAccounts(userId: string, take: number, cursor?: string): Promise<Account[] | []>;
  delete(accountId: string): Promise<void>;
}



