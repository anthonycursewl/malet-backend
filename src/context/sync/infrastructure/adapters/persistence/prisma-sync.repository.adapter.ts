import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  AcceptedSyncResult,
  SyncEntityType,
  SyncOperation,
} from '../../../domain/entities/sync.entity';
import {
  CachedClientOp,
  ServerRecordForConflict,
  SyncRepository,
} from '../../../domain/ports/out/sync.repository';

const SYNCABLE_ENTITIES: SyncEntityType[] = [
  'accounts',
  'transactions',
  'transaction_tag',
  'transaction_tag_assignment',
  'shared_accounts',
];

@Injectable()
export class PrismaSyncRepositoryAdapter implements SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCachedOp(
    userId: string,
    clientId: string,
  ): Promise<CachedClientOp | null> {
    const op = await this.prisma.client_ops.findUnique({
      where: { user_id_client_id: { user_id: userId, client_id: clientId } },
    });
    if (!op) return null;
    return { clientId: op.client_id, result: op.result as any };
  }

  async saveCachedOp(): Promise<void> {
    // Persistence is handled by the use case via direct prisma.client_ops.create
    // (kept here to satisfy the port contract).
    return;
  }

  async findByServerId(
    entity: SyncEntityType,
    userId: string,
    serverId: string,
  ): Promise<ServerRecordForConflict | null> {
    this.assertEntity(entity);

    if (entity === 'transaction_tag_assignment') {
      const [txId, tagId] = serverId.split('|');
      if (!txId || !tagId) return null;
      const row = await this.prisma.transaction_tag_assignment.findUnique({
        where: {
          transaction_id_tag_id: { transaction_id: txId, tag_id: tagId },
        },
      });
      if (!row) return null;
      return {
        id: serverId,
        user_id: userId,
        updated_at: row.assigned_at,
        deleted_at: null,
        data: {
          transaction_id: row.transaction_id,
          tag_id: row.tag_id,
          assigned_at: row.assigned_at.toISOString(),
        },
      };
    }

    if (entity === 'transactions') {
      const record = await this.prisma.transactions.findUnique({
        where: { id: serverId },
        include: { accounts: { select: { user_id: true } } },
      });
      if (!record) return null;
      return {
        id: record.id,
        user_id: record.accounts.user_id,
        updated_at: record.updated_at,
        deleted_at: record.deleted_at ?? null,
        data: this.toWirePayload(entity, record),
      };
    }

    const record = await (this.prisma as any)[entity].findUnique({
      where: { id: serverId },
    });
    if (!record) return null;
    return this.toServerRecord(entity, userId, record);
  }

  async createRecord(): Promise<{
    id: string;
    updated_at: Date;
    deleted_at: Date | null;
  }> {
    throw new Error('createRecord is not used directly; use applyOp');
  }

  async updateRecord(): Promise<{
    id: string;
    updated_at: Date;
    deleted_at: Date | null;
  }> {
    throw new Error('updateRecord is not used directly; use applyOp');
  }

  async softDeleteRecord(): Promise<{
    id: string;
    updated_at: Date;
    deleted_at: Date | null;
  }> {
    throw new Error('softDeleteRecord is not used directly; use applyOp');
  }

  async applyOp(
    entity: SyncEntityType,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    this.assertEntity(entity);

    return this.prisma.$transaction(async (tx) => {
      if (entity === 'accounts') {
        return this.applyAccounts(tx, op, userId, payload);
      }
      if (entity === 'transactions') {
        return this.applyTransactions(tx, op, userId, payload);
      }
      if (entity === 'transaction_tag') {
        return this.applyTransactionTag(tx, op, userId, payload);
      }
      if (entity === 'transaction_tag_assignment') {
        return this.applyTransactionTagAssignment(tx, op, userId, payload);
      }
      if (entity === 'shared_accounts') {
        return this.applySharedAccounts(tx, op, userId, payload);
      }
      throw new Error(`Unsupported entity: ${entity}`);
    });
  }

  async pullChanges(
    entity: SyncEntityType,
    userId: string,
    cursorDate: Date,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      data: Record<string, any>;
      updated_at: Date;
      deleted_at: Date | null;
    }>
  > {
    this.assertEntity(entity);

    if (entity === 'transaction_tag_assignment') {
      const rows = await this.prisma.transaction_tag_assignment.findMany({
        where: {
          transaction: { accounts: { user_id: userId } },
        },
        take: limit,
      });
      return rows.map((r) => ({
        id: `${r.transaction_id}|${r.tag_id}`,
        data: {
          transaction_id: r.transaction_id,
          tag_id: r.tag_id,
          assigned_at: r.assigned_at.toISOString(),
        },
        updated_at: r.assigned_at,
        deleted_at: null,
      }));
    }

    if (entity === 'transactions') {
      const records = await this.prisma.transactions.findMany({
        where: {
          accounts: { user_id: userId },
          updated_at: { gt: cursorDate },
        },
        include: { accounts: { select: { user_id: true } } },
        orderBy: { updated_at: 'asc' },
        take: limit,
      });

      return records.map((r: any) => ({
        id: r.id,
        data: this.toWirePayload(entity, r),
        updated_at: r.updated_at,
        deleted_at: r.deleted_at ?? null,
      }));
    }

    const records = await (this.prisma as any)[entity].findMany({
      where: {
        user_id: userId,
        updated_at: { gt: cursorDate },
      },
      orderBy: { updated_at: 'asc' },
      take: limit,
    });

    return records.map((r: any) => ({
      id: r.id,
      data: this.toWirePayload(entity, r),
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
    }));
  }

  // ---------- entity-specific apply helpers ----------

  private async applyAccounts(
    tx: Prisma.TransactionClient,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    if (op === 'create') {
      const id = payload.id ?? cryptoId();
      const created = await tx.accounts.create({
        data: {
          id,
          user_id: userId,
          name: String(payload.name ?? ''),
          currency: String(payload.currency ?? 'USD'),
          icon: payload.icon ?? null,
          balance: new Prisma.Decimal(payload.balance ?? 0),
          created_at: payload.created_at
            ? new Date(payload.created_at)
            : new Date(),
          updated_at: new Date(),
        },
      });
      return this.accepted(
        'accounts',
        created.id,
        created.updated_at,
        'accounts',
      );
    }
    if (op === 'update') {
      const id = payload.id;
      const data: any = { updated_at: new Date() };
      if (payload.name !== undefined) data.name = String(payload.name);
      if (payload.currency !== undefined)
        data.currency = String(payload.currency);
      if (payload.icon !== undefined) data.icon = payload.icon;
      if (payload.balance !== undefined)
        data.balance = new Prisma.Decimal(payload.balance);

      const updated = await tx.accounts.update({ where: { id }, data });
      return this.accepted(
        'accounts',
        updated.id,
        updated.updated_at,
        'accounts',
      );
    }
    // delete
    const id = payload.id;
    const updated = await tx.accounts.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return this.accepted(
      'accounts',
      updated.id,
      updated.updated_at,
      'accounts',
    );
  }

  private async applyTransactions(
    tx: Prisma.TransactionClient,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    if (op === 'create') {
      const id = payload.id ?? cryptoId();
      const created = await tx.transactions.create({
        data: {
          id,
          name: String(payload.name ?? ''),
          amount: new Prisma.Decimal(payload.amount ?? 0),
          type: String(payload.type ?? 'expense'),
          account_id: String(payload.account_id),
          currency_code: payload.currency_code ?? null,
          issued_at: payload.issued_at
            ? new Date(payload.issued_at)
            : new Date(),
          updated_at: new Date(),
          deleted_at: payload.deleted_at ? new Date(payload.deleted_at) : null,
        },
      });
      return this.accepted(
        'transactions',
        created.id,
        created.updated_at,
        'transactions',
      );
    }
    if (op === 'update') {
      const id = payload.id;
      const data: any = { updated_at: new Date() };
      if (payload.name !== undefined) data.name = String(payload.name);
      if (payload.amount !== undefined)
        data.amount = new Prisma.Decimal(payload.amount);
      if (payload.type !== undefined) data.type = String(payload.type);
      if (payload.currency_code !== undefined)
        data.currency_code = payload.currency_code;
      if (payload.issued_at !== undefined)
        data.issued_at = new Date(payload.issued_at);
      if (payload.deleted_at !== undefined)
        data.deleted_at = payload.deleted_at
          ? new Date(payload.deleted_at)
          : null;

      await tx.transactions.update({ where: { id }, data });
      return this.accepted('transactions', id, new Date(), 'transactions');
    }
    const id = payload.id;
    await tx.transactions.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return this.accepted('transactions', id, new Date(), 'transactions');
  }

  private async applyTransactionTag(
    tx: Prisma.TransactionClient,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    if (op === 'create') {
      const id = payload.id ?? cryptoId();
      const created = await tx.transaction_tag.create({
        data: {
          id,
          user_id: userId,
          name: String(payload.name ?? ''),
          slug: String(payload.slug ?? ''),
          color: payload.color ?? null,
          palette: payload.palette ?? Prisma.JsonNull,
          created_at: payload.created_at
            ? new Date(payload.created_at)
            : new Date(),
          updated_at: new Date(),
        },
      });
      return this.accepted(
        'transaction_tag',
        created.id,
        created.updated_at,
        'transaction_tag',
      );
    }
    if (op === 'update') {
      const id = payload.id;
      const data: any = { updated_at: new Date() };
      if (payload.name !== undefined) data.name = String(payload.name);
      if (payload.slug !== undefined) data.slug = String(payload.slug);
      if (payload.color !== undefined) data.color = payload.color;
      if (payload.palette !== undefined)
        data.palette = payload.palette ?? Prisma.JsonNull;

      const updated = await tx.transaction_tag.update({
        where: { id },
        data,
      });
      return this.accepted(
        'transaction_tag',
        updated.id,
        updated.updated_at,
        'transaction_tag',
      );
    }
    const id = payload.id;
    const updated = await tx.transaction_tag.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return this.accepted(
      'transaction_tag',
      updated.id,
      updated.updated_at,
      'transaction_tag',
    );
  }

  private async applyTransactionTagAssignment(
    tx: Prisma.TransactionClient,
    op: SyncOperation,
    _userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    const transactionId = String(
      payload.transaction_id ?? payload.transactionId ?? '',
    );
    const tagId = String(payload.tag_id ?? payload.tagId ?? '');

    if (!transactionId || !tagId) {
      throw new Error('transaction_id and tag_id are required');
    }

    if (op === 'create') {
      const created = await tx.transaction_tag_assignment.upsert({
        where: {
          transaction_id_tag_id: {
            transaction_id: transactionId,
            tag_id: tagId,
          },
        },
        update: {},
        create: {
          transaction_id: transactionId,
          tag_id: tagId,
          assigned_at: new Date(),
        },
      });
      return this.accepted(
        'transaction_tag_assignment',
        `${created.transaction_id}|${created.tag_id}`,
        created.assigned_at,
        'transaction_tag_assignment',
      );
    }
    if (op === 'delete') {
      await tx.transaction_tag_assignment.delete({
        where: {
          transaction_id_tag_id: {
            transaction_id: transactionId,
            tag_id: tagId,
          },
        },
      });
      return this.accepted(
        'transaction_tag_assignment',
        `${transactionId}|${tagId}`,
        new Date(),
        'transaction_tag_assignment',
      );
    }
    // update on a join table is a no-op (no mutable fields beyond the key)
    return this.accepted(
      'transaction_tag_assignment',
      `${transactionId}|${tagId}`,
      new Date(),
      'transaction_tag_assignment',
    );
  }

  private async applySharedAccounts(
    tx: Prisma.TransactionClient,
    op: SyncOperation,
    userId: string,
    payload: Record<string, any>,
  ): Promise<AcceptedSyncResult> {
    if (op === 'create') {
      const id = payload.id ?? cryptoId();
      const created = await tx.shared_accounts.create({
        data: {
          id,
          user_id: userId,
          account_id: String(payload.account_id),
          name: String(payload.name ?? ''),
          identification_number: payload.identification_number ?? null,
          phone_associated: payload.phone_associated ?? null,
          email_associated: payload.email_associated ?? null,
          icon_url: payload.icon_url ?? null,
          created_at: payload.created_at
            ? new Date(payload.created_at)
            : new Date(),
          updated_at: new Date(),
        },
      });
      return this.accepted(
        'shared_accounts',
        created.id,
        created.updated_at,
        'shared_accounts',
      );
    }
    if (op === 'update') {
      const id = payload.id;
      const data: any = { updated_at: new Date() };
      if (payload.name !== undefined) data.name = String(payload.name);
      if (payload.account_id !== undefined)
        data.account_id = String(payload.account_id);
      if (payload.identification_number !== undefined)
        data.identification_number = payload.identification_number;
      if (payload.phone_associated !== undefined)
        data.phone_associated = payload.phone_associated;
      if (payload.email_associated !== undefined)
        data.email_associated = payload.email_associated;
      if (payload.icon_url !== undefined) data.icon_url = payload.icon_url;

      const updated = await tx.shared_accounts.update({ where: { id }, data });
      return this.accepted(
        'shared_accounts',
        updated.id,
        updated.updated_at,
        'shared_accounts',
      );
    }
    const id = payload.id;
    const updated = await tx.shared_accounts.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return this.accepted(
      'shared_accounts',
      updated.id,
      updated.updated_at,
      'shared_accounts',
    );
  }

  // ---------- helpers ----------

  private toServerRecord(
    entity: SyncEntityType,
    userId: string,
    record: any,
  ): ServerRecordForConflict {
    return {
      id: record.id,
      user_id: record.user_id,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at ?? null,
      data: this.toWirePayload(entity, record),
    };
  }

  private toWirePayload(
    entity: SyncEntityType,
    record: any,
  ): Record<string, any> {
    if (entity === 'accounts') {
      return {
        id: record.id,
        user_id: record.user_id,
        name: record.name,
        currency: record.currency,
        icon: record.icon,
        balance: record.balance?.toString?.() ?? String(record.balance ?? 0),
        created_at: record.created_at?.toISOString?.() ?? null,
        updated_at: record.updated_at?.toISOString?.() ?? null,
        deleted_at: record.deleted_at?.toISOString?.() ?? null,
      };
    }
    if (entity === 'transactions') {
      return {
        id: record.id,
        user_id: record.accounts?.user_id ?? null,
        name: record.name,
        amount: record.amount?.toString?.() ?? String(record.amount ?? 0),
        type: record.type,
        account_id: record.account_id,
        currency_code: record.currency_code ?? null,
        issued_at: record.issued_at?.toISOString?.() ?? null,
        updated_at: record.updated_at?.toISOString?.() ?? null,
        deleted_at: record.deleted_at?.toISOString?.() ?? null,
        index_id: record.index_id ? record.index_id.toString() : null,
        source: 'manual',
        source_id: null,
        description: null,
        pending_balance: null,
      };
    }
    if (entity === 'transaction_tag') {
      return {
        id: record.id,
        user_id: record.user_id,
        name: record.name,
        slug: record.slug,
        color: record.color,
        palette: record.palette ?? null,
        created_at: record.created_at?.toISOString?.() ?? null,
        updated_at: record.updated_at?.toISOString?.() ?? null,
        deleted_at: record.deleted_at?.toISOString?.() ?? null,
      };
    }
    if (entity === 'shared_accounts') {
      return {
        id: record.id,
        user_id: record.user_id,
        account_id: record.account_id,
        name: record.name,
        identification_number: record.identification_number,
        phone_associated: record.phone_associated,
        email_associated: record.email_associated,
        icon_url: record.icon_url,
        created_at: record.created_at?.toISOString?.() ?? null,
        updated_at: record.updated_at?.toISOString?.() ?? null,
        deleted_at: record.deleted_at?.toISOString?.() ?? null,
      };
    }
    return { ...record };
  }

  private accepted(
    _entity: string,
    serverId: string,
    serverUpdatedAt: Date,
    entityType: SyncEntityType,
  ): AcceptedSyncResult {
    return {
      client_id: '',
      server_id: serverId,
      server_updated_at: serverUpdatedAt.toISOString(),
      entity_type: entityType,
    };
  }

  private assertEntity(entity: SyncEntityType): void {
    if (!SYNCABLE_ENTITIES.includes(entity)) {
      throw new Error(`Unsupported sync entity: ${entity}`);
    }
  }
}

function cryptoId(): string {
  return globalThis.crypto.randomUUID();
}
