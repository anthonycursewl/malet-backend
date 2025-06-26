import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Account, AccountPrimitives } from "../../domain/entities/account.entity";
import { AccountRepository } from "../../domain/ports/out/account.repository";

@Injectable()
export class AccountRepositoryAdapter implements AccountRepository {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    async create(account: Account): Promise<Account> {
        const accountPrimitives = account.toPrimitives()
        const created = await this.prisma.accounts.create({
            data: accountPrimitives
        })

        const primitives = {
            ...created,
            balance: Number(created.balance)
        }

        return Account.fromPrimitives(primitives)
    }

    async getAllAccounts(id: string): Promise<Account[]> {
        const accounts = await this.prisma.accounts.findMany({
            where: {
                user_id: id
            }
        })

        const primitives = accounts.map((account) => {
            return {
                ...account,
                balance: Number(account.balance)
            }
        })

        return primitives.map((primitives) => Account.fromPrimitives(primitives))
    }
}