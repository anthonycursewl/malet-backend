import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { RestoreSharedAccountUseCase } from '../domain/ports/in/restore-shared-account.usecase';
import { SharedAccount } from '../domain/entities/shared-account.entity';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class RestoreSharedAccountService implements RestoreSharedAccountUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(id: string): Promise<SharedAccount> {
        return this.sharedAccountRepository.restore(id);
    }
}
