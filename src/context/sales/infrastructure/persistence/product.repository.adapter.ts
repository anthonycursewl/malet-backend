import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ListProductsOptions,
  ProductRepository,
} from '../../domain/ports/out/product.repository';
import { Product } from '../../domain/entities/product.entity';

@Injectable()
export class ProductRepositoryAdapter implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): Product {
    return Product.fromPrimitives({
      ...row,
      cost: Number(row.cost),
      pvp: Number(row.pvp),
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(product: Product): Promise<Product> {
    const data = product.toPrimitives();

    const created = await this.prisma.store_products.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        name: data.name,
        cost: data.cost,
        pvp: data.pvp,
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
  ): Promise<Product | null> {
    const result = await this.prisma.store_products.findFirst({
      where: { id, store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  /** Single query for all the products of a cart (avoids N round-trips). */
  async findManyByIds(
    store_id: string,
    ids: string[],
    include_deleted = false,
  ): Promise<Product[]> {
    if (ids.length === 0) {
      return [];
    }

    const results = await this.prisma.store_products.findMany({
      where: {
        store_id,
        id: { in: ids },
        ...(include_deleted ? {} : { deleted_at: null }),
      },
    });

    return results.map((result) => this.toEntity(result));
  }

  async findMany(options: ListProductsOptions): Promise<Product[]> {
    const { store_id, take, cursor, include_deleted } = options;

    const results = await this.prisma.store_products.findMany({
      where: {
        store_id,
        ...(include_deleted ? {} : { deleted_at: null }),
      },
      take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(product: Product): Promise<Product> {
    const data = product.toPrimitives();

    const updated = await this.prisma.store_products.update({
      where: { id: data.id },
      data: {
        name: data.name,
        cost: data.cost,
        pvp: data.pvp,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<Product> {
    const deleted = await this.prisma.store_products.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<Product> {
    const restored = await this.prisma.store_products.update({
      where: { id },
      data: { deleted_at: null },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    try {
      await this.prisma.store_products.delete({ where: { id } });
    } catch (error) {
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot permanently delete a product that has registered sales',
        );
      }
      throw error;
    }
  }
}
