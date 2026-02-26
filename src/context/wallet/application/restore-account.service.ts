import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
    ACCOUNT_REPOSITORY_PORT,
    AccountRepository,
} from '../domain/ports/out/account.repository';
import { RestoreAccountUseCase } from '../domain/ports/in/restore-account.usecase';

@Injectable()
export class RestoreAccountService implements RestoreAccountUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository,
    ) { }

    async execute(userId: string, accountId: string): Promise<void> {
        const account = await this.accountRepository.findById(accountId, true);

        if (!account || account.getUserId() !== userId) {
            throw new NotFoundException('Account not found');
        }

        if (!account.getDeletedAt()) {
            return;
        }

        await this.accountRepository.restore(accountId);
    }
}
