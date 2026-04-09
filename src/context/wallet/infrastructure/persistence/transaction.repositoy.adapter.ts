import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TransactionRepository } from '../../domain/ports/out/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { HistoryTransactionOptions } from '../../domain/ports/in/get-history-transaction.usecase';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class TransactionRepositoryAdapter implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(tx: Transaction): Promise<Transaction> {
    const { tags, amount, ...txPrimitives } = tx.toPrimitives();
    const created = await this.prisma.transactions.create({
      data: {
        ...txPrimitives,
        index_id: txPrimitives.index_id ? BigInt(txPrimitives.index_id) : undefined,
        amount: new Decimal(amount),
      },
    });

    if (created.type !== 'pending_payment') {
      await this.prisma.accounts.update({
        where: {
          id: created.account_id,
        },
        data: {
          balance: {
            ...(created.type === 'saving'
              ? { increment: created.amount }
              : { decrement: created.amount }),
          },
        },
      });
    }
    const primitivesForDomain = {
      ...created,
      index_id: created.index_id ? created.index_id.toString() : undefined,
      amount: created.amount.toNumber(),
      tags: [],
    };

    return Transaction.fromPrimitives(primitivesForDomain);
  }

  async getHistoryTransaction(
    options: HistoryTransactionOptions,
  ): Promise<Transaction[]> {
    const {
      id,
      take,
      type,
      user_id,
      cursor,
      transactionTypes,
      tags: tagIds,
      startDate,
      endDate,
    } = options;

    const where: any = {
      ...(type === 'by_account_id'
        ? {
          account_id: id,
        }
        : {
          accounts: {
            user_id: user_id,
          },
        }),
    };

    if (transactionTypes && transactionTypes.length > 0) {
      where.type = { in: transactionTypes };
    }

    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tag_id: { in: tagIds },
        },
      };
    }

    if (startDate || endDate) {
      where.issued_at = {};
      if (startDate) where.issued_at.gte = startDate;
      if (endDate) where.issued_at.lte = endDate;
    }

    const txs = await this.prisma.transactions.findMany({
      where,
      take: take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        tags: {
          include: {
            transaction_tag: true,
          },
        },
      },
      orderBy: {
        issued_at: 'desc',
      },
    });

    return txs.map((tx) => {
      const primitives = {
        ...tx,
        index_id: tx.index_id ? tx.index_id.toString() : undefined,
        amount: tx.amount.toNumber(),
        currency_code: tx.currency_code,
        tags: tx.tags.map((t) => ({
          ...t.transaction_tag,
          palette: t.transaction_tag.palette as string[] || undefined,
        })),
      };
      return Transaction.fromPrimitives(primitives);
    });
  }

  async complete(id: string, newType: string): Promise<Transaction> {
    const tx = await this.prisma.transactions.findUnique({ where: { id } });
    if (!tx || tx.type !== 'pending_payment') {
      throw new Error('Transaction is not pending or does not exist');
    }

    const updated = await this.prisma.transactions.update({
      where: { id },
      data: { type: newType },
    });

    await this.prisma.accounts.update({
      where: { id: tx.account_id },
      data: {
        balance: {
          ...(newType === 'saving'
            ? { increment: tx.amount }
            : { decrement: tx.amount }),
        },
      },
    });

    return Transaction.fromPrimitives({
      ...updated,
      index_id: updated.index_id ? updated.index_id.toString() : undefined,
      amount: updated.amount.toNumber(),
      currency_code: (updated as any).currency_code,
      tags: [],
    });
  }
}
