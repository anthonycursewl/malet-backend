import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  NotificationLogEntry,
  NotificationLogPayload,
  NotificationLogRepository,
  NotificationLogStatus,
} from '../../domain/ports/out/notification-log.repository';

@Injectable()
export class NotificationLogRepositoryAdapter
  implements NotificationLogRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: NotificationLogEntry): Promise<void> {
    await this.prisma.store_notification_logs.create({
      data: {
        id: entry.id,
        store_id: entry.store_id,
        event: entry.event,
        subject: entry.subject,
        recipients: entry.recipients,
        payload: entry.payload
          ? (entry.payload as unknown as Prisma.InputJsonValue)
          : undefined,
        attempts: entry.attempts,
        status: entry.status,
        error: entry.error ?? null,
        created_at: entry.created_at,
      },
    });
  }

  async countSentSince(store_id: string, since: Date): Promise<number> {
    return this.prisma.store_notification_logs.count({
      where: { store_id, status: 'sent', created_at: { gte: since } },
    });
  }

  async findRetryable(
    since: Date,
    maxAttempts: number,
  ): Promise<NotificationLogEntry[]> {
    const rows = await this.prisma.store_notification_logs.findMany({
      where: {
        status: 'failed',
        attempts: { lt: maxAttempts },
        created_at: { gte: since },
      },
      orderBy: { created_at: 'asc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      store_id: row.store_id,
      event: row.event,
      subject: row.subject,
      recipients: (row.recipients as string[]) ?? [],
      payload:
        (row.payload as unknown as NotificationLogPayload | null) ?? null,
      attempts: row.attempts,
      status: row.status as NotificationLogStatus,
      error: row.error,
      created_at: row.created_at,
    }));
  }

  async updateResult(
    id: string,
    status: NotificationLogStatus,
    error: string | null,
    attempts: number,
  ): Promise<void> {
    await this.prisma.store_notification_logs.update({
      where: { id },
      data: { status, error, attempts },
    });
  }
}
