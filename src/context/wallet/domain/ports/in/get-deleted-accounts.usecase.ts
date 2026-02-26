import { Account } from '../../entities/account.entity';

export const GET_DELETED_ACCOUNTS_USECASE = 'GET_DELETED_ACCOUNTS_USECASE';

export interface GetDeletedAccountsUseCase {
    execute(userId: string, take: number, cursor?: string): Promise<Account[] | []>;
}
