import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { TransactionRepository } from "../../domain/ports/out/transaction.repository";
import { Transaction } from "../../domain/entities/transaction.entity";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class TransactionRepositoryAdapter implements TransactionRepository {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    async save(tx: Transaction): Promise<Transaction> {
        const txPrimitives = tx.toPrimitives()
        const created = await this.prisma.transactions.create({
            data: {
                ...txPrimitives,
                amount: new Decimal(txPrimitives.amount)
            } 
        })

        const account = await this.prisma.accounts.update({
            where: {
                id: created.account_id
            },
            data: {
                balance: {
                    ...(created.type === 'saving' ? 
                        { increment: created.amount } : 
                        { decrement: created.amount }),
                }
            }
        })

        const primitivesForDomain = {
            ...account,
            amount: account.balance.toNumber(), 
            type: created.type,
            account_id: created.account_id,
            issued_at: created.issued_at
        };

        return Transaction.fromPrimitives(primitivesForDomain)
    }

    async getHistoryTransaction(id: string, skip: number, take: number, type: 'by_account_id' | 'by_user_id', user_id: string): Promise<Transaction[]> {
        const where = {
            ...(type === 'by_account_id' ? {
                account_id: id
            } : {
                accounts: {
                    user_id: user_id
                }
            })
        }
        
        const txs = await this.prisma.transactions.findMany({
            where,
            skip,
            take,
            orderBy: {
                issued_at: 'desc'
            }
        })

        const primitives = txs.map((tx) => {
            return {
                ...tx,
                amount: Number(tx.amount)
            }
        })

        return primitives.map((primitives) => Transaction.fromPrimitives(primitives))
    }
}