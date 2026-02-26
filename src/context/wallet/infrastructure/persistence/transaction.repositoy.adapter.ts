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
    const txPrimitives = tx.toPrimitives();
    const created = await this.prisma.transactions.create({
      data: {
        ...txPrimitives,
        amount: new Decimal(txPrimitives.amount),
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
      id: created.id,
      name: created.name,
      amount: created.amount.toNumber(),
      type: created.type,
      account_id: created.account_id,
      issued_at: created.issued_at,
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
      orderBy: {
        issued_at: 'desc',
      },
    });



    const primitives = txs.map((tx) => {
      return {
        ...tx,
        amount: tx.amount.toNumber(),
      };
    });

    return primitives.map((primitives) =>
      Transaction.fromPrimitives(primitives),
    );
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
      id: updated.id,
      name: updated.name,
      amount: updated.amount.toNumber(),
      type: updated.type,
      account_id: updated.account_id,
      issued_at: updated.issued_at,
    });
  }
}

