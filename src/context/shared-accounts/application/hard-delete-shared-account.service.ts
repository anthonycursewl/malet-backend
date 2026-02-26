import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HardDeleteSharedAccountUseCase } from '../domain/ports/in/hard-delete-shared-account.usecase';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class HardDeleteSharedAccountService implements HardDeleteSharedAccountUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(id: string): Promise<void> {
        const sharedAccount = await this.sharedAccountRepository.findById(id);
        if (!sharedAccount) throw new NotFoundException('Shared account not found');

        return this.sharedAccountRepository.hardDelete(id);
    }
}
