import { Account, AccountPrimitives } from '../../entities/account.entity';

export const UPDATE_ACCOUNT_USECASE = 'UPDATE_ACCOUNT_USECASE';

export interface UpdateAccount extends Omit<
  AccountPrimitives,
  'id' | 'created_at' | 'updated_at' | 'user_id' | 'icon'
> {
  name: string;
  currency: string;
  balance: number;
}

export interface UpdateAccountUseCase {
  execute(
    userId: string,
    accountId: string,
    updateAccountDto: UpdateAccount,
  ): Promise<Account>;
}
