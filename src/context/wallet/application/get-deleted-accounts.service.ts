import { Inject, Injectable } from '@nestjs/common';
import {
    ACCOUNT_REPOSITORY_PORT,
    AccountRepository,
} from '../domain/ports/out/account.repository';
import { Account } from '../domain/entities/account.entity';
import { GetDeletedAccountsUseCase } from '../domain/ports/in/get-deleted-accounts.usecase';

@Injectable()
export class GetDeletedAccountsService implements GetDeletedAccountsUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository,
    ) { }

    async execute(
        userId: string,
        take: number,
        cursor?: string,
    ): Promise<Account[] | []> {
        return await this.accountRepository.getDeletedAccounts(
            userId,
            take,
            cursor,
        );
    }
}
