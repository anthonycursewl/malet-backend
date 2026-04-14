import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TransactionRepository } from '../../domain/ports/out/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { HistoryTransactionOptions } from '../../domain/ports/in/get-history-transaction.usecase';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionRepositoryAdapter implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(tx: Transaction): Promise<Transaction> {
    const { tags, amount, ...txPrimitives } = tx.toPrimitives();
    const created = await this.prisma.transactions.create({
      data: {
        ...txPrimitives,
        index_id: txPrimitives.index_id
          ? BigInt(txPrimitives.index_id)
          : undefined,
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
      deleted,
      tags: tagIds,
      startDate,
      endDate,
    } = options;

    // 1. Construcción dinámica del objeto where
    const where: Prisma.transactionsWhereInput = {
      ...(type === 'by_account_id'
        ? { account_id: id }
        : { accounts: { user_id } }),
    };

    // 2. Filtro por tipos de transacción (ej. 'egresos' -> spending, payment)
    if (transactionTypes?.length) {
      where.type = { in: transactionTypes };
    }

    // 3. Filtro por etiquetas
    if (tagIds?.length) {
      where.tags = {
        some: {
          tag_id: { in: tagIds },
        },
      };
    }

    // 4. Filtro por rango de fechas
    if (startDate || endDate) {
      where.issued_at = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    // 5. Filtro de Soft Delete (Eliminados vs Activos)
    // - true: Solo eliminados
    // - false: Solo activos
    // - undefined: Por defecto activos
    if (deleted === true) {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }

    // 5. Estrategia de cursores
    let prismaCursor: Prisma.transactionsWhereUniqueInput | undefined =
      undefined;
    let orderBy: Prisma.transactionsOrderByWithRelationInput = {
      index_id: 'desc',
    };

    if (cursor) {
      const isIndexCursor = /^\d+$/.test(cursor);
      if (isIndexCursor) {
        prismaCursor = { index_id: BigInt(cursor) };
        orderBy = { index_id: 'desc' };
      } else {
        prismaCursor = { id: cursor };
        orderBy = { issued_at: 'desc' };
      }
    }

    // 6. Consulta Prisma corregida
    const txs = await this.prisma.transactions.findMany({
      where, // Corregido el error de sintaxis 'where: { or }'
      take,
      ...(prismaCursor && {
        skip: 1,
        cursor: prismaCursor,
      }),
      include: {
        tags: {
          include: {
            transaction_tag: true,
          },
        },
      },
      orderBy,
    });

    // 7. Mapeo a modelo de dominio
    return txs.map((tx) => {
      const primitives = {
        ...tx,
        index_id: tx.index_id?.toString(),
        amount: tx.amount.toNumber(),
        currency_code: tx.currency_code ?? undefined,
        tags: tx.tags.map((t) => ({
          ...t.transaction_tag,
          palette: (t.transaction_tag.palette as string[]) || undefined,
        })),
        deleted_at: tx.deleted_at,
      };
      return Transaction.fromPrimitives(primitives as any);
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
      currency_code: updated.currency_code ?? undefined,
      tags: [],
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    const tx = await this.prisma.transactions.findUnique({
      where: { id },
      include: { tags: { include: { transaction_tag: true } } },
    });
    if (!tx) return null;

    const primitives = {
      ...tx,
      index_id: tx.index_id ? tx.index_id.toString() : undefined,
      amount: tx.amount.toNumber(),
      currency_code: tx.currency_code ?? undefined,
      tags: tx.tags.map((t) => ({
        ...t.transaction_tag,
        palette: (t.transaction_tag.palette as string[]) || undefined,
      })),
      deleted_at: tx.deleted_at,
    };

    return Transaction.fromPrimitives(primitives as any);
  }

  async findByIndexId(indexId: string): Promise<Transaction | null> {
    const tx = await this.prisma.transactions.findUnique({
      where: { index_id: BigInt(indexId) },
      include: { tags: { include: { transaction_tag: true } } },
    });
    if (!tx) return null;

    const primitives = {
      ...tx,
      index_id: tx.index_id ? tx.index_id.toString() : undefined,
      amount: tx.amount.toNumber(),
      currency_code: tx.currency_code ?? undefined,
      tags: tx.tags.map((t) => ({
        ...t.transaction_tag,
        palette: (t.transaction_tag.palette as string[]) || undefined,
      })),
      deleted_at: tx.deleted_at,
    };

    return Transaction.fromPrimitives(primitives as any);
  }

  /**
   * Delete a transaction ensuring DB integrity using a Prisma transaction.
   * - Reverts account balance if the transaction already affected it
   * - Removes tag assignments
   * - Deletes the transaction row
   */
  async delete(id: string): Promise<Transaction | null> {
    // Soft-delete: mark deleted_at and updated_at. Revert balance and delete assignments inside a transaction.
    const tx = await this.prisma.transactions.findUnique({ where: { id } });
    if (!tx) return;

    try {
      const updated = await this.prisma.$transaction(async (prisma) => {
        if (tx.type !== 'pending_payment' && !tx.deleted_at) {
          await prisma.accounts.update({
            where: { id: tx.account_id },
            data: {
              balance: {
                ...(tx.type === 'saving'
                  ? { decrement: tx.amount }
                  : { increment: tx.amount }),
              },
            },
          });
        }

        // Keep transaction_tag_assignment for restore support. Do not delete here.

        // Soft delete transaction and return the updated row
        const u = await prisma.transactions.update({
          where: { id },
          data: { deleted_at: new Date() },
          include: { tags: { include: { transaction_tag: true } } },
        });

        return u;
      });

      // Map to domain Transaction and return
      const primitives = {
        ...updated,
        index_id: updated.index_id ? updated.index_id.toString() : undefined,
        amount: updated.amount.toNumber(),
        currency_code: updated.currency_code ?? undefined,
        tags: updated.tags.map((t: any) => ({
          ...t.transaction_tag,
          palette: (t.transaction_tag.palette as string[]) || undefined,
        })),
        deleted_at: updated.deleted_at,
      };

      return Transaction.fromPrimitives(primitives as any);
    } catch (e) {
      throw e;
    }
  }

  async findDeletedOlderThan(date: Date): Promise<Transaction[]> {
    const txs = await this.prisma.transactions.findMany({
      where: {
        deleted_at: {
          lt: date,
        },
      },
      include: {
        tags: {
          include: {
            transaction_tag: true,
          },
        },
      },
    });

    return txs.map((tx) => {
      const primitives = {
        ...tx,
        index_id: tx.index_id ? tx.index_id.toString() : undefined,
        amount: tx.amount.toNumber(),
        currency_code: tx.currency_code ?? undefined,
        tags: tx.tags.map((t) => ({
          ...t.transaction_tag,
          palette: (t.transaction_tag.palette as string[]) || undefined,
        })),
        deleted_at: tx.deleted_at,
      };
      return Transaction.fromPrimitives(primitives as any);
    });
  }

  async deleteHard(indexId: string): Promise<void> {
    await this.prisma.transactions.delete({
      where: { index_id: BigInt(indexId) },
    });
  }

  async restore(indexId: string, userId: string): Promise<Transaction | null> {
    const restored = await this.prisma.$transaction(async (prisma) => {
      // 1. Fetch transaction and verify ownership in one go
      const tx = await prisma.transactions.findFirst({
        where: {
          index_id: BigInt(indexId),
          accounts: { user_id: userId },
        },
      });

      if (!tx) return null;
      if (!tx.deleted_at) return tx as any; // Already restored

      // 2. Revert account balance logic
      if (tx.type !== 'pending_payment') {
        await prisma.accounts.update({
          where: { id: tx.account_id },
          data: {
            balance: {
              ...(tx.type === 'saving'
                ? { increment: tx.amount }
                : { decrement: tx.amount }),
            },
          },
        });
      }

      // 3. Mark as active
      return await prisma.transactions.update({
        where: { id: tx.id },
        data: { deleted_at: null },
        include: { tags: { include: { transaction_tag: true } } },
      });
    });

    if (!restored) return null;

    const primitives = {
      ...restored,
      index_id: restored.index_id ? restored.index_id.toString() : undefined,
      amount: restored.amount.toNumber(),
      currency_code: (restored as any).currency_code ?? undefined,
      tags: restored.tags.map((t: any) => ({
        ...t.transaction_tag,
        palette: (t.transaction_tag.palette as string[]) || undefined,
      })),
      deleted_at: restored.deleted_at,
    };

    return Transaction.fromPrimitives(primitives as any);
  }
}
