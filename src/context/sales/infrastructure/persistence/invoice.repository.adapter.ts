import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  InvoiceRepository,
  InvoiceTotals,
  ListInvoicesOptions,
} from '../../domain/ports/out/invoice.repository';
import {
  Invoice,
  InvoiceLinePrimitives,
} from '../../domain/entities/invoice.entity';

@Injectable()
export class InvoiceRepositoryAdapter implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Invoice {
    return Invoice.fromPrimitives({
      ...row,
      customer_id: row.customer_id ?? null,
      customer_name: row.customer_name ?? null,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      notes: row.notes ?? null,
      due_at: row.due_at ?? null,
      paid_at: row.paid_at ?? null,
      payment_method_id: row.payment_method_id ?? null,
      sale_id: row.sale_id ?? null,
      receipt_id: row.receipt_id ?? null,
      lines: (row.lines ?? []) as InvoiceLinePrimitives[],
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(invoice: Invoice): Promise<Invoice> {
    const data = invoice.toPrimitives();

    const created = await this.prisma.store_invoices.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name ?? null,
        sequence: data.sequence,
        year: data.year,
        number: data.number,
        currency: data.currency,
        subtotal: data.subtotal,
        total: data.total,
        notes: data.notes ?? null,
        status: data.status,
        issued_at: data.issued_at,
        due_at: data.due_at ?? null,
        paid_at: data.paid_at ?? null,
        payment_method_id: data.payment_method_id ?? null,
        sale_id: data.sale_id ?? null,
        receipt_id: data.receipt_id ?? null,
        lines: data.lines as unknown as object,
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
  ): Promise<Invoice | null> {
    const result = await this.prisma.store_invoices.findFirst({
      where: { id, store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findMany(options: ListInvoicesOptions): Promise<Invoice[]> {
    const { store_id, take, cursor, status, customer_id, range } = options;

    const results = await this.prisma.store_invoices.findMany({
      where: {
        store_id,
        deleted_at: null,
        ...(status && { status }),
        ...(customer_id && { customer_id }),
        ...(range && {
          issued_at: range.inclusive
            ? { gte: range.from, lte: range.to }
            : { gte: range.from, lt: range.to },
        }),
      },
      take: take ?? 20,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { issued_at: 'desc' },
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(invoice: Invoice): Promise<Invoice> {
    const data = invoice.toPrimitives();

    const updated = await this.prisma.store_invoices.update({
      where: { id: data.id },
      data: {
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name ?? null,
        subtotal: data.subtotal,
        total: data.total,
        notes: data.notes ?? null,
        status: data.status,
        issued_at: data.issued_at,
        due_at: data.due_at ?? null,
        lines: data.lines as unknown as object,
        updated_at: data.updated_at,
        deleted_at: data.deleted_at ?? null,
      },
    });

    return this.toEntity(updated);
  }

  async markPaid(invoice: Invoice): Promise<Invoice | null> {
    const data = invoice.toPrimitives();

    // Conditional update: only one request can move `pending` → `paid`.
    const result = await this.prisma.store_invoices.updateMany({
      where: { id: data.id, status: 'pending', deleted_at: null },
      data: {
        status: 'paid',
        paid_at: data.paid_at,
        payment_method_id: data.payment_method_id ?? null,
        sale_id: data.sale_id ?? null,
        receipt_id: data.receipt_id ?? null,
        updated_at: data.updated_at,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(data.store_id, data.id);
  }

  /**
   * Reserves the next sequence of the year with an advisory lock, so concurrent
   * invoices never repeat nor skip a folio number.
   */
  async reserveNextSequence(year: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${INVOICE_SEQUENCE_LOCK_KEY}, ${year})`;

      const rows = await tx.$queryRaw<{ next: number }[]>`
        SELECT COALESCE(MAX(sequence), 0) + 1 AS next
        FROM store_invoices
        WHERE year = ${year}
      `;

      return Number(rows[0]?.next ?? 1);
    });
  }

  async getTotals(store_id: string): Promise<InvoiceTotals> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0)::text AS pending_total,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)::text AS paid_total
      FROM store_invoices
      WHERE store_id = ${store_id} AND deleted_at IS NULL
    `;

    const row = rows[0];
    return {
      pending_count: Number(row?.pending_count ?? 0),
      pending_total: Number(row?.pending_total ?? 0),
      paid_count: Number(row?.paid_count ?? 0),
      paid_total: Number(row?.paid_total ?? 0),
    };
  }
}

/** Namespace key for the yearly invoice-sequence advisory lock. */
const INVOICE_SEQUENCE_LOCK_KEY = 20261019;
