import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma.service';
import {
  CustomerRepository,
  CustomerStats,
  ListCustomersOptions,
  StoreCustomerLink,
} from '../../domain/ports/out/customer.repository';
import { Customer } from '../../domain/entities/customer.entity';

@Injectable()
export class CustomerRepositoryAdapter implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Customer {
    return Customer.fromPrimitives({
      ...row,
      phone: row.phone ?? null,
      email: row.email ?? null,
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(customer: Customer, store_id: string): Promise<Customer> {
    const data = customer.toPrimitives();

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.customers.create({
        data: {
          id: data.id,
          name: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          deleted_at: null,
        },
      });

      await tx.store_customers.create({
        data: {
          id: randomUUID(),
          store_id,
          customer_id: data.id,
          created_by: data.created_by,
          created_at: data.created_at,
          deleted_at: null,
        },
      });

      return row;
    });

    return this.toEntity(created);
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customers.findFirst({
      where: { id, deleted_at: null },
    });

    return row ? this.toEntity(row) : null;
  }

  /**
   * Dedupe on create: same phone already linked to a store where this user is an
   * active member. That way the same person is never duplicated for a user.
   */
  async findByPhoneForUser(
    phone: string,
    user_id: string,
  ): Promise<Customer | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.*
      FROM customers c
      JOIN store_customers sc ON sc.customer_id = c.id AND sc.deleted_at IS NULL
      JOIN store_members sm ON sm.store_id = sc.store_id AND sm.deleted_at IS NULL
      WHERE c.phone = ${phone}
        AND c.deleted_at IS NULL
        AND sm.user_id = ${user_id}
      LIMIT 1
    `;

    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findLinkedCustomer(
    store_id: string,
    customer_id: string,
  ): Promise<Customer | null> {
    const link = await this.prisma.store_customers.findFirst({
      where: { store_id, customer_id, deleted_at: null },
      select: { id: true },
    });

    if (!link) {
      return null;
    }

    return this.findById(customer_id);
  }

  async isLinked(store_id: string, customer_id: string): Promise<boolean> {
    const link = await this.prisma.store_customers.findFirst({
      where: { store_id, customer_id, deleted_at: null },
      select: { id: true },
    });

    return link !== null;
  }

  async link(
    store_id: string,
    customer_id: string,
    created_by: string,
  ): Promise<void> {
    // Idempotent: reactivates the link when it already existed.
    await this.prisma.store_customers.upsert({
      where: { store_id_customer_id: { store_id, customer_id } },
      create: {
        id: randomUUID(),
        store_id,
        customer_id,
        created_by,
        deleted_at: null,
      },
      update: { deleted_at: null },
    });
  }

  async unlink(store_id: string, customer_id: string): Promise<void> {
    await this.prisma.store_customers.updateMany({
      where: { store_id, customer_id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
  }

  async findMany(options: ListCustomersOptions): Promise<StoreCustomerLink[]> {
    const { store_id, take, cursor, search } = options;

    const rows = await this.prisma.store_customers.findMany({
      where: {
        store_id,
        deleted_at: null,
        // Keyset pagination over the auto-increment `seq`: no offsets, no gaps.
        ...(cursor !== undefined && { seq: { gt: BigInt(cursor) } }),
        customer: {
          deleted_at: null,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }),
        },
      },
      include: { customer: true },
      orderBy: { seq: 'asc' },
      take,
    });

    return rows.map((row) => ({
      customer: this.toEntity(row.customer),
      seq: Number(row.seq),
      linked_at: row.created_at,
    }));
  }

  async update(customer: Customer): Promise<Customer> {
    const data = customer.toPrimitives();

    const updated = await this.prisma.customers.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(updated);
  }

  async countActiveLinks(customer_id: string): Promise<number> {
    return this.prisma.store_customers.count({
      where: { customer_id, deleted_at: null },
    });
  }

  async hardDelete(id: string): Promise<void> {
    // Links cascade; past sales keep their receipt snapshot and null the FK.
    await this.prisma.customers.delete({ where: { id } });
  }

  async getStats(
    store_id: string,
    customer_id: string,
  ): Promise<CustomerStats> {
    const [summary] = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(DISTINCT s.id)::int AS purchase_count,
        COALESCE(SUM(i.quantity), 0)::int AS units_bought,
        COALESCE(SUM(i.unit_price * i.quantity), 0)::text AS total_spent,
        MIN(s.sold_at) AS first_purchase_at,
        MAX(s.sold_at) AS last_purchase_at
      FROM store_sales s
      JOIN store_sale_items i ON i.sale_id = s.id AND i.deleted_at IS NULL
      WHERE s.store_id = ${store_id}
        AND s.customer_id = ${customer_id}
        AND s.deleted_at IS NULL
    `;

    const purchase_count = Number(summary?.purchase_count ?? 0);
    const total_spent = Number(summary?.total_spent ?? 0);
    const first = summary?.first_purchase_at
      ? new Date(summary.first_purchase_at)
      : null;
    const last = summary?.last_purchase_at
      ? new Date(summary.last_purchase_at)
      : null;

    // Purchase frequency: average days between purchases.
    let average_days_between: number | null = null;
    if (first && last && purchase_count > 1) {
      average_days_between = Number(
        (
          (last.getTime() - first.getTime()) /
          86_400_000 /
          (purchase_count - 1)
        ).toFixed(2),
      );
    }

    const topProducts = await this.prisma.$queryRaw<any[]>`
      SELECT
        i.product_id,
        COALESCE(MAX(p.name), 'Producto') AS product_name,
        SUM(i.quantity)::int AS units,
        SUM(i.unit_price * i.quantity)::text AS revenue
      FROM store_sales s
      JOIN store_sale_items i ON i.sale_id = s.id AND i.deleted_at IS NULL
      LEFT JOIN store_products p ON p.id = i.product_id
      WHERE s.store_id = ${store_id}
        AND s.customer_id = ${customer_id}
        AND s.deleted_at IS NULL
      GROUP BY i.product_id
      ORDER BY units DESC
      LIMIT 5
    `;

    const topMethods = await this.prisma.$queryRaw<any[]>`
      SELECT
        s.payment_method_id,
        MAX(pm.name) AS name,
        COUNT(DISTINCT s.id)::int AS sales
      FROM store_sales s
      LEFT JOIN store_payment_methods pm ON pm.id = s.payment_method_id
      WHERE s.store_id = ${store_id}
        AND s.customer_id = ${customer_id}
        AND s.deleted_at IS NULL
      GROUP BY s.payment_method_id
      ORDER BY sales DESC
      LIMIT 3
    `;

    const byWeekday = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(DOW FROM s.sold_at)::int AS weekday,
        COUNT(DISTINCT s.id)::int AS sales
      FROM store_sales s
      WHERE s.store_id = ${store_id}
        AND s.customer_id = ${customer_id}
        AND s.deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1
    `;

    const recentSales = await this.prisma.$queryRaw<any[]>`
      SELECT
        s.id,
        s.sold_at,
        COALESCE(SUM(i.unit_price * i.quantity), 0)::text AS total,
        COALESCE(SUM(i.quantity), 0)::int AS items
      FROM store_sales s
      JOIN store_sale_items i ON i.sale_id = s.id AND i.deleted_at IS NULL
      WHERE s.store_id = ${store_id}
        AND s.customer_id = ${customer_id}
        AND s.deleted_at IS NULL
      GROUP BY s.id, s.sold_at
      ORDER BY s.sold_at DESC
      LIMIT 10
    `;

    return {
      purchase_count,
      units_bought: Number(summary?.units_bought ?? 0),
      total_spent,
      average_ticket:
        purchase_count > 0
          ? Number((total_spent / purchase_count).toFixed(2))
          : 0,
      first_purchase_at: first ? first.toISOString() : null,
      last_purchase_at: last ? last.toISOString() : null,
      average_days_between,
      top_products: topProducts.map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        units: Number(row.units),
        revenue: Number(row.revenue),
      })),
      top_payment_methods: topMethods.map((row) => ({
        payment_method_id: row.payment_method_id ?? null,
        name: row.name ?? null,
        sales: Number(row.sales),
      })),
      by_weekday: byWeekday.map((row) => ({
        weekday: Number(row.weekday),
        sales: Number(row.sales),
      })),
      recent_sales: recentSales.map((row) => ({
        id: row.id,
        sold_at: new Date(row.sold_at).toISOString(),
        total: Number(row.total),
        items: Number(row.items),
      })),
    };
  }
}
