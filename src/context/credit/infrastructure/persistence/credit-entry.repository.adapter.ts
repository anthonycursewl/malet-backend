import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  CreditEntryRepository,
  ListCreditEntriesOptions,
  MonthCreditEntriesOptions,
} from '../../domain/ports/out/credit-entry.repository';
import { CreditEntry } from '../../domain/entities/credit-entry.entity';

@Injectable()
export class CreditEntryRepositoryAdapter implements CreditEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): CreditEntry {
    return CreditEntry.fromPrimitives({
      ...row,
      amount: Number(row.amount),
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(entry: CreditEntry): Promise<CreditEntry> {
    const data = entry.toPrimitives();

    const created = await this.prisma.credit_entries.create({
      data: {
        id: data.id,
        user_id: data.user_id,
        type: data.type,
        concept: data.concept,
        party: data.party ?? null,
        amount: data.amount,
        due_date: data.due_date,
        account_id: data.account_id ?? null,
        status: data.status,
        settled_at: data.settled_at ?? null,
        settled_transaction_id: data.settled_transaction_id ?? null,
        settled_transaction_index: data.settled_transaction_index ?? null,
        notes: data.notes ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
      },
    });

    return this.toEntity(created);
  }

  async findById(
    user_id: string,
    id: string,
    include_deleted = false,
  ): Promise<CreditEntry | null> {
    const result = await this.prisma.credit_entries.findFirst({
      where: { id, user_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findMany(options: ListCreditEntriesOptions): Promise<CreditEntry[]> {
    const { user_id, take, cursor, type, status, account_id } = options;

    const results = await this.prisma.credit_entries.findMany({
      where: {
        user_id,
        deleted_at: null,
        ...(type && { type }),
        ...(status && { status }),
        ...(account_id && { account_id }),
      },
      take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: [{ due_date: 'asc' }, { id: 'asc' }],
    });

    return results.map((result) => this.toEntity(result));
  }

  async findMonth(options: MonthCreditEntriesOptions): Promise<CreditEntry[]> {
    const { user_id, from, to, type, status, account_id } = options;

    const results = await this.prisma.credit_entries.findMany({
      where: {
        user_id,
        deleted_at: null,
        due_date: { gte: from, lt: to },
        ...(type && { type }),
        ...(status && { status }),
        ...(account_id && { account_id }),
      },
      orderBy: [{ due_date: 'asc' }, { id: 'asc' }],
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(entry: CreditEntry): Promise<CreditEntry> {
    const {
      id,
      user_id: _user_id,
      created_at: _created_at,
      deleted_at: _deleted_at,
      ...data
    } = entry.toPrimitives();

    const updated = await this.prisma.credit_entries.update({
      where: { id },
      data: {
        ...data,
        party: data.party ?? null,
        account_id: data.account_id ?? null,
        settled_at: data.settled_at ?? null,
        settled_transaction_id: data.settled_transaction_id ?? null,
        settled_transaction_index: data.settled_transaction_index ?? null,
        notes: data.notes ?? null,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<CreditEntry> {
    const now = new Date();
    const deleted = await this.prisma.credit_entries.update({
      where: { id },
      data: { deleted_at: now, updated_at: now },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<CreditEntry> {
    const restored = await this.prisma.credit_entries.update({
      where: { id },
      data: { deleted_at: null, updated_at: new Date() },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.credit_entries.delete({ where: { id } });
  }
}
