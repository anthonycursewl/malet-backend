import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ListMemberSummariesOptions,
  ListStoresForMemberOptions,
  MemberSummary,
  StoreRepository,
} from '../../domain/ports/out/store.repository';
import { Store } from '../../domain/entities/store.entity';
import { StoreMember } from '../../domain/entities/store-member.entity';
import { UserSummary } from '../../domain/types';

@Injectable()
export class StoreRepositoryAdapter implements StoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toStore(row: any): Store {
    return Store.fromPrimitives({ ...row, deleted_at: row.deleted_at ?? null });
  }

  private toMember(row: any): StoreMember {
    return StoreMember.fromPrimitives({
      ...row,
      deleted_at: row.deleted_at ?? null,
    });
  }

  async saveWithOwnerMember(
    store: Store,
    ownerMember: StoreMember,
  ): Promise<Store> {
    const storeData = store.toPrimitives();
    const memberDataPrimitives = ownerMember.toPrimitives();

    const [createdStore] = await this.prisma.$transaction([
      this.prisma.stores.create({
        data: {
          id: storeData.id,
          name: storeData.name,
          user_id: storeData.user_id,
          currency: storeData.currency,
          phone: storeData.phone ?? null,
          email: storeData.email ?? null,
          address: storeData.address ?? null,
          receipt_mode: storeData.receipt_mode ?? 'ask',
          created_at: storeData.created_at,
          updated_at: storeData.updated_at,
          deleted_at: null,
        },
      }),
      this.prisma.store_members.create({
        data: {
          id: memberDataPrimitives.id,
          store_id: memberDataPrimitives.store_id,
          user_id: memberDataPrimitives.user_id,
          created_by: memberDataPrimitives.created_by,
          created_at: memberDataPrimitives.created_at,
          deleted_at: null,
        },
      }),
    ]);

    return this.toStore(createdStore);
  }

  async findById(
    store_id: string,
    include_deleted = false,
  ): Promise<Store | null> {
    const result = await this.prisma.stores.findUnique({
      where: { id: store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toStore(result);
  }

  async findStoresForMember(
    options: ListStoresForMemberOptions,
  ): Promise<Store[]> {
    const { user_id, take, cursor } = options;

    const results = await this.prisma.stores.findMany({
      where: {
        deleted_at: null,
        members: {
          some: {
            user_id,
            deleted_at: null,
          },
        },
      },
      take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    return results.map((result) => this.toStore(result));
  }

  async update(store: Store): Promise<Store> {
    const data = store.toPrimitives();

    const updated = await this.prisma.stores.update({
      where: { id: data.id },
      data: {
        name: data.name,
        currency: data.currency,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        receipt_mode: data.receipt_mode ?? 'ask',
        updated_at: data.updated_at,
      },
    });

    return this.toStore(updated);
  }

  async delete(store_id: string): Promise<Store> {
    const deleted = await this.prisma.stores.update({
      where: { id: store_id },
      data: { deleted_at: new Date() },
    });

    return this.toStore(deleted);
  }

  async restore(store_id: string): Promise<Store> {
    const restored = await this.prisma.stores.update({
      where: { id: store_id },
      data: { deleted_at: null },
    });

    return this.toStore(restored);
  }

  async hardDelete(store_id: string): Promise<void> {
    // Explicit deletion order: line items before products (that FK is
    // NO ACTION on purpose, so a product with sales cannot be removed) and
    // receipts/invites/customer links before the store itself.
    await this.prisma.$transaction([
      this.prisma.store_sale_items.deleteMany({
        where: { sale: { store_id } },
      }),
      this.prisma.store_receipts.deleteMany({ where: { store_id } }),
      this.prisma.store_sales.deleteMany({ where: { store_id } }),
      this.prisma.store_customers.deleteMany({ where: { store_id } }),
      this.prisma.store_payment_methods.deleteMany({ where: { store_id } }),
      this.prisma.store_products.deleteMany({ where: { store_id } }),
      this.prisma.store_invites.deleteMany({ where: { store_id } }),
      this.prisma.store_members.deleteMany({ where: { store_id } }),
      this.prisma.stores.delete({ where: { id: store_id } }),
    ]);
  }

  async saveMember(member: StoreMember): Promise<StoreMember> {
    const data = member.toPrimitives();

    try {
      const created = await this.prisma.store_members.create({
        data: {
          id: data.id,
          store_id: data.store_id,
          user_id: data.user_id,
          created_by: data.created_by,
          created_at: data.created_at,
          deleted_at: null,
        },
      });
      return this.toMember(created);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'This user is already a member of the store',
        );
      }
      throw error;
    }
  }

  async findMemberById(
    store_id: string,
    member_id: string,
    include_deleted = false,
  ): Promise<StoreMember | null> {
    const result = await this.prisma.store_members.findFirst({
      where: { id: member_id, store_id },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toMember(result);
  }

  /**
   * Optimized members query: selects only the columns the list renders and
   * paginates with keyset over `seq` (no offsets, no full scans).
   */
  async findMemberSummaries(
    options: ListMemberSummariesOptions,
  ): Promise<MemberSummary[]> {
    const { store_id, take, cursor } = options;

    const rows = await this.prisma.store_members.findMany({
      where: {
        store_id,
        deleted_at: null,
        ...(cursor !== undefined && { seq: { gt: BigInt(cursor) } }),
      },
      select: {
        id: true,
        user_id: true,
        seq: true,
        user: {
          select: {
            name: true,
            avatar_url: true,
            banner_url: true,
            verified: true,
            verification_type: { select: { type: true } },
          },
        },
      },
      orderBy: { seq: 'asc' },
      take,
    });

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      seq: Number(row.seq),
      name: row.user?.name ?? null,
      avatar_url: row.user?.avatar_url ?? null,
      banner_url: row.user?.banner_url ?? null,
      verified: row.user?.verified ?? false,
      verification_type: row.user?.verification_type?.type ?? null,
    }));
  }

  async findMembership(
    store_id: string,
    user_id: string,
  ): Promise<StoreMember | null> {
    const result = await this.prisma.store_members.findFirst({
      where: { store_id, user_id, deleted_at: null },
    });

    return result ? this.toMember(result) : null;
  }

  async findMemberByUser(
    store_id: string,
    user_id: string,
    include_deleted = false,
  ): Promise<StoreMember | null> {
    const result = await this.prisma.store_members.findUnique({
      where: { store_id_user_id: { store_id, user_id } },
    });

    if (!result || (!include_deleted && result.deleted_at !== null)) {
      return null;
    }

    return this.toMember(result);
  }

  async updateMember(member: StoreMember): Promise<StoreMember> {
    const data = member.toPrimitives();

    const updated = await this.prisma.store_members.update({
      where: { id: data.id },
      data: {
        deleted_at: data.deleted_at ?? null,
      },
    });

    return this.toMember(updated);
  }

  async deleteMember(member_id: string): Promise<StoreMember> {
    const deleted = await this.prisma.store_members.update({
      where: { id: member_id },
      data: { deleted_at: new Date() },
    });

    return this.toMember(deleted);
  }

  async restoreMember(member_id: string): Promise<StoreMember> {
    const restored = await this.prisma.store_members.update({
      where: { id: member_id },
      data: { deleted_at: null },
    });

    return this.toMember(restored);
  }

  async hardDeleteMember(member_id: string): Promise<void> {
    await this.prisma.store_members.delete({ where: { id: member_id } });
  }

  async countActiveMembers(store_id: string): Promise<number> {
    return this.prisma.store_members.count({
      where: { store_id, deleted_at: null },
    });
  }

  async hasSales(store_id: string): Promise<boolean> {
    const count = await this.prisma.store_sales.count({
      where: { store_id, deleted_at: null },
    });
    return count > 0;
  }

  async userExists(user_id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id: user_id },
    });
    return count > 0;
  }

  async findUserSummary(user_id: string): Promise<UserSummary | null> {
    const result = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, name: true, avatar_url: true },
    });

    return result ?? null;
  }
}
