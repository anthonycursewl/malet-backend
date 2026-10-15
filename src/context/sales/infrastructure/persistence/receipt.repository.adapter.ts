import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ListReceiptsOptions,
  ReceiptRepository,
} from '../../domain/ports/out/receipt.repository';
import {
  Receipt,
  ReceiptLinePrimitives,
  ReceiptPaymentPrimitives,
} from '../../domain/entities/receipt.entity';

@Injectable()
export class ReceiptRepositoryAdapter implements ReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Receipt {
    return Receipt.fromPrimitives({
      ...row,
      customer_name: row.customer_name ?? null,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      paid_amount: Number(row.paid_amount),
      lines: (row.lines ?? []) as ReceiptLinePrimitives[],
      payments: (row.payments ?? []) as ReceiptPaymentPrimitives[],
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(receipt: Receipt): Promise<Receipt> {
    const data = receipt.toPrimitives();

    const created = await this.prisma.store_receipts.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        sale_id: data.sale_id,
        sequence: data.sequence,
        year: data.year,
        number: data.number,
        customer_name: data.customer_name ?? null,
        currency: data.currency,
        // Datos del emisor congelados al emitir (inmutables).
        store_name: data.store_name ?? null,
        store_phone: data.store_phone ?? null,
        store_email: data.store_email ?? null,
        store_address: data.store_address ?? null,
        subtotal: data.subtotal,
        total: data.total,
        paid_amount: data.paid_amount,
        lines: data.lines as unknown as object,
        payments: data.payments as unknown as object,
        issued_at: data.issued_at,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
      },
    });

    return this.toEntity(created);
  }

  async findById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Receipt | null> {
    const result = await this.prisma.store_receipts.findFirst({
      where: { id, store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findBySaleId(
    store_id: string,
    sale_id: string,
  ): Promise<Receipt | null> {
    const result = await this.prisma.store_receipts.findFirst({
      where: { sale_id, store_id, deleted_at: null },
    });

    return result ? this.toEntity(result) : null;
  }

  /** Public verification: no store filter (the folio is global). */
  async findByNumber(number: string): Promise<Receipt | null> {
    const result = await this.prisma.store_receipts.findFirst({
      where: { number },
    });

    return result ? this.toEntity(result) : null;
  }

  /** Only the audited "Facturar a" correction is updatable. */
  async update(receipt: Receipt): Promise<Receipt> {
    const data = receipt.toPrimitives();

    const updated = await this.prisma.store_receipts.update({
      where: { id: data.id },
      data: {
        customer_name: data.customer_name ?? null,
        customer_name_updated_at: data.customer_name_updated_at ?? null,
        customer_name_updated_by: data.customer_name_updated_by ?? null,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(updated);
  }

  async findMany(options: ListReceiptsOptions): Promise<Receipt[]> {
    const { store_id, take, cursor } = options;

    const results = await this.prisma.store_receipts.findMany({
      where: { store_id, deleted_at: null },
      take: take ?? 20,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { issued_at: 'desc' },
    });

    return results.map((result) => this.toEntity(result));
  }

  async delete(id: string): Promise<Receipt> {
    const deleted = await this.prisma.store_receipts.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Receipt> {
    const restored = await this.prisma.store_receipts.update({
      where: { id },
      data: { deleted_at: null },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.store_receipts.delete({ where: { id } });
  }

  /**
   * Reserves the next sequence of the year. The advisory lock makes concurrent
   * receipts (even from different stores) wait for each other, so the global
   * Breadriuss sequence never repeats nor skips a number.
   */
  async reserveNextSequence(year: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${RECEIPT_SEQUENCE_LOCK_KEY}, ${year})`;

      const rows = await tx.$queryRaw<{ next: number }[]>`
        SELECT COALESCE(MAX(sequence), 0) + 1 AS next
        FROM store_receipts
        WHERE year = ${year}
      `;

      return Number(rows[0]?.next ?? 1);
    });
  }
}

/** Namespace key for the yearly receipt-sequence advisory lock. */
const RECEIPT_SEQUENCE_LOCK_KEY = 20260923;
