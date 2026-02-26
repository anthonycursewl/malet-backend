import { Injectable, Inject } from '@nestjs/common';
import { GetSharedAccountsUseCase } from '../domain/ports/in/get-shared-accounts.usecase';
import { SharedAccount } from '../domain/entities/shared-account.entity';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
    GetSharedAccountsOptions,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class GetSharedAccountsService implements GetSharedAccountsUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(options: GetSharedAccountsOptions): Promise<SharedAccount[]> {
        return this.sharedAccountRepository.getSharedAccounts(options);
    }
}
