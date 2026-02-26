import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DeleteSharedAccountUseCase } from '../domain/ports/in/delete-shared-account.usecase';
import { SharedAccount } from '../domain/entities/shared-account.entity';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class DeleteSharedAccountService implements DeleteSharedAccountUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(id: string): Promise<SharedAccount> {
        const sharedAccount = await this.sharedAccountRepository.findById(id);
        if (!sharedAccount) throw new NotFoundException('Shared account not found');

        return this.sharedAccountRepository.delete(id);
    }
}
