import { Account } from "../../entities/account.entity"

export const ACCOUNT_REPOSITORY_PORT = 'ACCOUNT_REPOSITORY_PORT' 

export interface AccountRepository {
    create(account: Account): Promise<Account>
    getAllAccounts(id: string): Promise<Account[]>
}