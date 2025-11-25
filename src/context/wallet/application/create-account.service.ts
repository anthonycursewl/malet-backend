import { Inject, Injectable } from "@nestjs/common";
import { ACCOUNT_REPOSITORY_PORT, AccountRepository } from "../domain/ports/out/account.repository";
import { Account, AccountPrimitives } from "../domain/entities/account.entity";
import { CreateAccountUseCase } from "../domain/ports/in/create-account.usecase";

@Injectable()
export class CreateAccountService implements CreateAccountUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository
    ) { }

    async execute(account: Omit<AccountPrimitives, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
        const created = Account.create(account)
        return this.accountRepository.create(created)
    }
}