import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { AccountRepository, ACCOUNT_REPOSITORY_PORT } from "../domain/ports/out/account.repository";
import { UpdateAccount, UpdateAccountUseCase } from "../domain/ports/in/update-account.usecase";

@Injectable()
export class UpdateAccountService implements UpdateAccountUseCase {
    constructor(
        @Inject(ACCOUNT_REPOSITORY_PORT)
        private readonly accountRepository: AccountRepository
    ) { }

    async execute(userId: string, accountId: string, updateAccountDto: UpdateAccount) {
        const account = await this.accountRepository.findById(accountId)

        if (!account) {
            throw new Error('Account not found')
        }

        // Validar que la cuenta pertenezca al usuario autenticado
        if (account.toPrimitives().user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para modificar esta cuenta')
        }

        return this.accountRepository.update(accountId, updateAccountDto)
    }
}