import { Injectable, Inject } from '@nestjs/common';
import { CreateSharedAccountUseCase } from '../domain/ports/in/create-shared-account.usecase';
import { SharedAccount } from '../domain/entities/shared-account.entity';
import { CreateSharedAccountDto } from './dtos/create-shared-account.dto';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class CreateSharedAccountService implements CreateSharedAccountUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(user_id: string, dto: CreateSharedAccountDto): Promise<SharedAccount> {
        const newSharedAccount = SharedAccount.create({
            ...dto,
            user_id
        });
        return this.sharedAccountRepository.save(newSharedAccount);
    }
}
