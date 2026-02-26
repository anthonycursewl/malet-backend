import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateSharedAccountUseCase } from '../domain/ports/in/update-shared-account.usecase';
import { SharedAccount } from '../domain/entities/shared-account.entity';
import { UpdateSharedAccountDto } from './dtos/update-shared-account.dto';
import {
    SHARED_ACCOUNT_REPOSITORY_PORT,
    SharedAccountRepository,
} from '../domain/ports/out/shared-account.repository';

@Injectable()
export class UpdateSharedAccountService implements UpdateSharedAccountUseCase {
    constructor(
        @Inject(SHARED_ACCOUNT_REPOSITORY_PORT)
        private readonly sharedAccountRepository: SharedAccountRepository,
    ) { }

    async execute(id: string, dto: UpdateSharedAccountDto): Promise<SharedAccount> {
        const sharedAccount = await this.sharedAccountRepository.findById(id);
        if (!sharedAccount) throw new NotFoundException('Shared account not found');

        const updatedSharedAccount = sharedAccount.update(dto);

        return this.sharedAccountRepository.update(updatedSharedAccount);
    }
}
