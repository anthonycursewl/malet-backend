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

    async execute(userId: string, account: Omit<AccountPrimitives, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Account> {
        const accountWithUser = {
            ...account,
            user_id: userId  // Forzar el userId del usuario autenticado
        };
        const created = Account.create(accountWithUser)
        return this.accountRepository.create(created)
    }
}