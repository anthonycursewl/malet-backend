import { Account, AccountPrimitives } from "../../entities/account.entity"

export const CREATE_ACCOUNT_USECASE = 'CREATE_ACCOUNT_USECASE'

export interface CreateAccountUseCase {
    execute(account: Omit<AccountPrimitives, 'id' | 'created_at' | 'updated_at'>): Promise<Account>
}