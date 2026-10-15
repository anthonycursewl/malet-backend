import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  ListSalesOptions,
  SaleRepository,
} from '../../domain/ports/out/sale.repository';
import { Sale } from '../../domain/entities/sale.entity';
import {
  SalesAggregateOptions,
  SalesSeriesOptions,
  SalesSeriesPoint,
  SalesSummaryNumbers,
} from '../../domain/types';

interface AggregateRow {
  sales_count: number;
  units_sold: number;
  revenue: string;
  cost: string;
  profit: string;
}

interface SeriesRow extends AggregateRow {
  bucket: Date | string;
}

/** Line items are always loaded with their product name for display. */
const SALE_INCLUDE = {
  items: {
    where: { deleted_at: null },
    include: { product: { select: { name: true } } },
  },
} as const;

@Injectable()
export class SaleRepositoryAdapter implements SaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Sale {
    return Sale.fromPrimitives({
      ...row,
      payment_method_id: row.payment_method_id ?? null,
      customer_id: row.customer_id ?? null,
      reference_currency: row.reference_currency ?? null,
      reference_amount:
        row.reference_amount == null ? null : Number(row.reference_amount),
      deleted_at: row.deleted_at ?? null,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        unit_cost: Number(item.unit_cost),
        product_name: item.product?.name,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted_at: item.deleted_at ?? null,
      })),
    });
  }

  /** Header fields shared by create/update. */
  private headerData(data: ReturnType<Sale['toPrimitives']>) {
    return {
      store_id: data.store_id,
      payment_method_id: data.payment_method_id ?? null,
      customer_id: data.customer_id ?? null,
      reference_currency: data.reference_currency ?? null,
      reference_amount: data.reference_amount ?? null,
      sold_at: data.sold_at,
      created_by: data.created_by,
    };
  }

  async save(sale: Sale): Promise<Sale> {
    const data = sale.toPrimitives();

    const created = await this.prisma.store_sales.create({
      data: {
        id: data.id,
        ...this.headerData(data),
        created_at: data.created_at,
        updated_at: data.updated_at,
        deleted_at: null,
        items: {
          create: data.items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            created_at: item.created_at,
            updated_at: item.updated_at,
            deleted_at: null,
          })),
        },
      },
      include: SALE_INCLUDE,
    });

    return this.toEntity(created);
  }

  async findById(
    store_id: string,
    id: string,
    include_deleted = false,
  ): Promise<Sale | null> {
    const result = await this.prisma.store_sales.findFirst({
      where: { id, store_id },
      include: SALE_INCLUDE,
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findMany(options: ListSalesOptions): Promise<Sale[]> {
    const { store_id, take, cursor, payment_method_id, product_id, range } =
      options;

    const results = await this.prisma.store_sales.findMany({
      where: {
        store_id,
        deleted_at: null,
        ...(payment_method_id && { payment_method_id }),
        // A product filter matches sales that contain that product.
        ...(product_id && {
          items: { some: { product_id, deleted_at: null } },
        }),
        ...(range && {
          sold_at: range.inclusive
            ? { gte: range.from, lte: range.to }
            : { gte: range.from, lt: range.to },
        }),
      },
      take: take ?? 20,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { sold_at: 'desc' },
      include: SALE_INCLUDE,
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(sale: Sale): Promise<Sale> {
    const data = sale.toPrimitives();

    // The edit form sends the whole cart, so the lines are replaced.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.store_sales.update({
        where: { id: data.id },
        data: {
          ...this.headerData(data),
          updated_at: data.updated_at,
        },
      });

      await tx.store_sale_items.deleteMany({ where: { sale_id: data.id } });
      await tx.store_sale_items.createMany({
        data: data.items.map((item) => ({
          id: item.id,
          sale_id: data.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          created_at: item.created_at ?? new Date(),
          updated_at: item.updated_at ?? new Date(),
          deleted_at: null,
        })),
      });

      return tx.store_sales.findUnique({
        where: { id: data.id },
        include: SALE_INCLUDE,
      });
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<Sale> {
    const deleted = await this.prisma.store_sales.update({
      where: { id },
      data: { deleted_at: new Date() },
      include: SALE_INCLUDE,
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Sale> {
    const restored = await this.prisma.store_sales.update({
      where: { id },
      data: { deleted_at: null },
      include: SALE_INCLUDE,
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    // Line items go away with the sale (ON DELETE CASCADE).
    await this.prisma.store_sales.delete({ where: { id } });
  }

  async getSummary(
    options: SalesAggregateOptions,
  ): Promise<SalesSummaryNumbers> {
    const where = this.buildWhere(options);

    const rows = await this.prisma.$queryRaw<AggregateRow[]>`
      SELECT
        COUNT(DISTINCT s.id)::int AS sales_count,
        COALESCE(SUM(i.quantity), 0)::int AS units_sold,
        COALESCE(SUM(i.unit_price * i.quantity), 0)::text AS revenue,
        COALESCE(SUM(i.unit_cost * i.quantity), 0)::text AS cost,
        COALESCE(SUM((i.unit_price - i.unit_cost) * i.quantity), 0)::text AS profit
      FROM store_sales s
      JOIN store_sale_items i ON i.sale_id = s.id AND i.deleted_at IS NULL
      ${where}
    `;

    const row = rows[0];
    if (!row) {
      return { sales_count: 0, units_sold: 0, revenue: 0, cost: 0, profit: 0 };
    }

    return {
      sales_count: row.sales_count,
      units_sold: row.units_sold,
      revenue: Number(row.revenue),
      cost: Number(row.cost),
      profit: Number(row.profit),
    };
  }

  async getSeries(options: SalesSeriesOptions): Promise<SalesSeriesPoint[]> {
    const where = this.buildWhere(options);

    const rows = await this.prisma.$queryRaw<SeriesRow[]>`
      SELECT
        date_trunc(${options.period}::text, s.sold_at) AS bucket,
        COUNT(DISTINCT s.id)::int AS sales_count,
        COALESCE(SUM(i.quantity), 0)::int AS units_sold,
        COALESCE(SUM(i.unit_price * i.quantity), 0)::text AS revenue,
        COALESCE(SUM(i.unit_cost * i.quantity), 0)::text AS cost,
        COALESCE(SUM((i.unit_price - i.unit_cost) * i.quantity), 0)::text AS profit
      FROM store_sales s
      JOIN store_sale_items i ON i.sale_id = s.id AND i.deleted_at IS NULL
      ${where}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((row) => ({
      bucket: new Date(row.bucket).toISOString(),
      sales_count: row.sales_count,
      units_sold: row.units_sold,
      revenue: Number(row.revenue),
      cost: Number(row.cost),
      profit: Number(row.profit),
    }));
  }

  private buildWhere(options: SalesAggregateOptions): Prisma.Sql {
    let where = Prisma.sql`WHERE s.store_id = ${options.store_id} AND s.deleted_at IS NULL`;

    if (options.payment_method_id) {
      where = Prisma.sql`${where} AND s.payment_method_id = ${options.payment_method_id}`;
    }

    if (options.product_id) {
      where = Prisma.sql`${where} AND i.product_id = ${options.product_id}`;
    }

    const range = options.range;
    if (range) {
      const endOperator = Prisma.raw(range.inclusive ? '<=' : '<');
      where = Prisma.sql`${where} AND s.sold_at >= ${range.from} AND s.sold_at ${endOperator} ${range.to}`;
    }

    return where;
  }
}
