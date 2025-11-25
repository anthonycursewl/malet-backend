import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Account } from "../../domain/entities/account.entity";
import { AccountRepository } from "../../domain/ports/out/account.repository";
import { UpdateAccount } from "../../domain/ports/in/update-account.usecase";

@Injectable()
export class AccountRepositoryAdapter implements AccountRepository {
    constructor(
        private readonly prisma: PrismaService
    ) { }

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

    async getAllAccounts(userId: string): Promise<Account[] | []> {
        const accounts = await this.prisma.accounts.findMany({
            where: {
                user_id: userId
            }
        })

        const primitives = accounts.map((account) => {
            return {
                ...account,
                balance: Number(account.balance)
            }
        })

        const fetchedAccounts = primitives.map((primitives) => Account.fromPrimitives(primitives))
        if (!fetchedAccounts) return []

        return fetchedAccounts
    }

    async update(accountId: string, updateAccountDto: UpdateAccount): Promise<Account> {
        const account = await this.prisma.accounts.update({
            where: {
                id: accountId
            },
            data: updateAccountDto
        })

        const primitives = {
            ...account,
            balance: Number(account.balance)
        }

        return Account.fromPrimitives(primitives)
    }

    async findById(accountId: string): Promise<Account | null> {
        const account = await this.prisma.accounts.findUnique({
            where: {
                id: accountId
            }
        })

        if (!account) return null

        const primitives = {
            ...account,
            balance: Number(account.balance)
        }

        return Account.fromPrimitives(primitives)
    }
}