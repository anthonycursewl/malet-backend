import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TransactionTagRepository } from '../../domain/ports/out/transaction-tag.repository';
import {
  TransactionTag,
  TransactionTagPrimitives,
} from '../../domain/entities/transaction-tag.entity';

@Injectable()
export class TransactionTagRepositoryAdapter implements TransactionTagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(tag: TransactionTag): Promise<TransactionTag> {
    const primitives = tag.toPrimitives();

    // Construir payload de creación sin palette para evitar problemas de types en Prisma
    const createPayload: any = {
      id: primitives.id,
      name: primitives.name,
      slug: primitives.slug,
      color: primitives.color,
      user_id: primitives.user_id,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at,
    };

    // Construir payloads dinámicos para incluir palette cuando esté definido
    const needPalette = (primitives as any).palette != null;
    const createPayloadWithPalette: any = {
      id: primitives.id,
      name: primitives.name,
      slug: primitives.slug,
      color: primitives.color,
      user_id: primitives.user_id,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at,
      ...(needPalette ? { palette: (primitives as any).palette } : {}),
    };
    const updatedPayloadWithPalette: any = {
      name: primitives.name,
      slug: primitives.slug,
      color: primitives.color,
      updated_at: primitives.updated_at,
      deleted_at: primitives.deleted_at,
      ...(needPalette ? { palette: (primitives as any).palette } : {}),
    };

    const created = await this.prisma.transaction_tag
      .upsert({
        where: { id: primitives.id },
        create: createPayloadWithPalette,
        update: updatedPayloadWithPalette,
      })
      .catch((e) => {
        throw e;
      });

    return TransactionTag.fromPrimitives(this.mapToPrimitives(created));
  }

  async findById(id: string): Promise<TransactionTag | null> {
    const tag = await this.prisma.transaction_tag.findFirst({
      where: { id, deleted_at: null },
    });

    return tag
      ? TransactionTag.fromPrimitives(this.mapToPrimitives(tag))
      : null;
  }

  async findBySlug(
    userId: string,
    slug: string,
  ): Promise<TransactionTag | null> {
    const tag = await this.prisma.transaction_tag.findFirst({
      where: { user_id: userId, slug, deleted_at: null },
    });

    return tag
      ? TransactionTag.fromPrimitives(this.mapToPrimitives(tag))
      : null;
  }

  async findByUserId(userId: string): Promise<TransactionTag[]> {
    const tags = await this.prisma.transaction_tag.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    return tags.map((tag) =>
      TransactionTag.fromPrimitives(this.mapToPrimitives(tag)),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction_tag.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async assignToTransaction(
    transactionId: string,
    tagIds: string[],
  ): Promise<void> {
    if (tagIds.length === 0) return;

    await this.prisma.transaction_tag_assignment.createMany({
      data: tagIds.map((tagId) => ({
        transaction_id: transactionId,
        tag_id: tagId,
      })),
      skipDuplicates: true,
    });
  }

  async removeFromTransaction(
    transactionId: string,
    tagId: string,
  ): Promise<void> {
    await this.prisma.transaction_tag_assignment.delete({
      where: {
        transaction_id_tag_id: {
          transaction_id: transactionId,
          tag_id: tagId,
        },
      },
    });
  }

  async findByTransactionId(transactionId: string): Promise<TransactionTag[]> {
    const assignments = await this.prisma.transaction_tag_assignment.findMany({
      where: { transaction_id: transactionId },
      include: { transaction_tag: true },
    });

    return assignments
      .filter((a) => !a.transaction_tag.deleted_at)
      .map((a) =>
        TransactionTag.fromPrimitives(this.mapToPrimitives(a.transaction_tag)),
      );
  }

  private mapToPrimitives(tag: any): TransactionTagPrimitives {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      user_id: tag.user_id,
      palette: tag.palette,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      deleted_at: tag.deleted_at,
    };
  }
}
