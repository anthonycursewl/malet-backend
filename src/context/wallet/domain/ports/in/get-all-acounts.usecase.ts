import { Account } from "../../entities/account.entity"

export const GET_ALL_ACCOUNTS_USECASE = 'GET_ALL_ACCOUNTS_USECASE'

export interface GetAllAccountsUseCase {
    execute(id: string): Promise<Account[] | []>
}
