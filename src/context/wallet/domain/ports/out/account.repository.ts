import { Account } from "../../entities/account.entity"
import { UpdateAccount } from "../in/update-account.usecase"

export const ACCOUNT_REPOSITORY_PORT = 'ACCOUNT_REPOSITORY_PORT'

export interface AccountRepository {
    create(account: Account): Promise<Account>
    getAllAccounts(userId: string): Promise<Account[] | []>
    findById(accountId: string): Promise<Account | null>
    update(accountId: string, updateAccountDto: UpdateAccount): Promise<Account>
}