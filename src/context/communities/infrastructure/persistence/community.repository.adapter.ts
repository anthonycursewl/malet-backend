import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  CommunityRepository,
  CommunitySearchParams,
  CommunitySearchResult,
  UpdateCommunityData,
} from '../../domain/ports/out/community.repository';
import { Community } from '../../domain/entities/community.entity';
import { CommunityType } from '../../domain/enums/community-type.enum';

@Injectable()
export class CommunityRepositoryAdapter implements CommunityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(community: Community): Promise<Community> {
    const primitives = community.toPrimitives();

    const saved = await this.prisma.community.create({
      data: {
        id: primitives.id,
        name: primitives.name,
        description: primitives.description,
        slug: primitives.slug,
        type: primitives.type,
        avatar_url: primitives.avatarUrl,
        banner_url: primitives.bannerUrl,
        member_count: primitives.memberCount,
        is_active: primitives.isActive,
        owner_id: primitives.ownerId,
        created_at: primitives.createdAt,
        updated_at: primitives.updatedAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async findById(id: string): Promise<Community | null> {
    const community = await this.prisma.community.findUnique({
      where: { id },
    });

    return community ? this.mapToDomain(community) : null;
  }

  async findBySlug(slug: string): Promise<Community | null> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
    });

    return community ? this.mapToDomain(community) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Community[]> {
    const communities = await this.prisma.community.findMany({
      where: { owner_id: ownerId },
      orderBy: { created_at: 'desc' },
    });

    return communities.map((c) => this.mapToDomain(c));
  }

  async search(params: CommunitySearchParams): Promise<CommunitySearchResult> {
    const where: any = {
      is_active: true,
    };

    if (params.query) {
      where.OR = [
        { name: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    if (params.type) {
      where.type = params.type;
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { member_count: 'desc' },
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      communities: communities.map((c) => this.mapToDomain(c)),
      total,
    };
  }

  async update(id: string, data: UpdateCommunityData): Promise<Community> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.bannerUrl !== undefined) updateData.banner_url = data.bannerUrl;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const updated = await this.prisma.community.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.community.delete({
      where: { id },
    });
  }

  async incrementMemberCount(id: string): Promise<void> {
    await this.prisma.community.update({
      where: { id },
      data: { member_count: { increment: 1 } },
    });
  }

  async decrementMemberCount(id: string): Promise<void> {
    await this.prisma.community.update({
      where: { id },
      data: { member_count: { decrement: 1 } },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.community.count({
      where: { slug },
    });
    return count > 0;
  }

  /**
   * Mapea los datos de Prisma a la entidad de dominio
   */
  private mapToDomain(data: any): Community {
    return Community.fromPrimitives({
      id: data.id,
      name: data.name,
      description: data.description,
      slug: data.slug,
      type: data.type as CommunityType,
      avatarUrl: data.avatar_url,
      bannerUrl: data.banner_url,
      memberCount: data.member_count,
      isActive: data.is_active,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }
}
