import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
    ACCOUNT_REPOSITORY_PORT,
    AccountRepository,
} from '../domain/ports/out/account.repository';
import { DeleteAccountUseCase } from '../domain/ports/in/delete-account.usecase';

@Injectable()
export class DeleteAccountService implements DeleteAccountUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository,
    ) { }

    async execute(userId: string, accountId: string): Promise<void> {
        const account = await this.accountRepository.findById(accountId);

        if (!account || account.getUserId() !== userId) {
            throw new NotFoundException('Account not found');
        }

        await this.accountRepository.softDelete(accountId);
    }
}
