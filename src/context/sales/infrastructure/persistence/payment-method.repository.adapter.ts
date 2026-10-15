import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ListPaymentMethodsOptions,
  PaymentMethodRepository,
} from '../../domain/ports/out/payment-method.repository';
import { PaymentMethod } from '../../domain/entities/payment-method.entity';
import { MAX_LIST_TAKE } from '../../domain/constants';

@Injectable()
export class PaymentMethodRepositoryAdapter implements PaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): PaymentMethod {
    return PaymentMethod.fromPrimitives({
      ...row,
      deleted_at: row.deleted_at ?? null,
    });
  }

  async save(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    const data = paymentMethod.toPrimitives();

    const created = await this.prisma.store_payment_methods.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        name: data.name,
        active: data.active,
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
  ): Promise<PaymentMethod | null> {
    const result = await this.prisma.store_payment_methods.findFirst({
      where: { id, store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toEntity(result);
  }

  async findMany(options: ListPaymentMethodsOptions): Promise<PaymentMethod[]> {
    const { store_id, take, cursor, include_deleted } = options;

    const results = await this.prisma.store_payment_methods.findMany({
      where: {
        store_id,
        ...(include_deleted ? {} : { deleted_at: null }),
      },
      // Cap defensivo: los métodos de cobro se listan completos, pero nunca sin
      // límite (evita consultas sin acotar).
      take: take ?? MAX_LIST_TAKE,
      ...(take &&
        cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
      orderBy: { created_at: 'desc' },
    });

    return results.map((result) => this.toEntity(result));
  }

  async update(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    const data = paymentMethod.toPrimitives();

    const updated = await this.prisma.store_payment_methods.update({
      where: { id: data.id },
      data: {
        name: data.name,
        active: data.active,
        updated_at: data.updated_at,
      },
    });

    return this.toEntity(updated);
  }

  async delete(id: string): Promise<PaymentMethod> {
    const deleted = await this.prisma.store_payment_methods.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return this.toEntity(deleted);
  }

  async restore(id: string): Promise<PaymentMethod> {
    const restored = await this.prisma.store_payment_methods.update({
      where: { id },
      data: { deleted_at: null },
    });

    return this.toEntity(restored);
  }

  async hardDelete(id: string): Promise<void> {
    try {
      await this.prisma.store_payment_methods.delete({ where: { id } });
    } catch (error) {
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot permanently delete a payment method that has registered sales. Soft-delete or deactivate it instead.',
        );
      }
      throw error;
    }
  }
}
