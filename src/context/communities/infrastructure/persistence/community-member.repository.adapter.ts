import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CommunityMemberRepository } from '../../domain/ports/out/community-member.repository';
import { CommunityMember } from '../../domain/entities/community-member.entity';
import { MemberRole } from '../../domain/enums/member-role.enum';
import { MembershipStatus } from '../../domain/enums/membership-status.enum';

@Injectable()
export class CommunityMemberRepositoryAdapter implements CommunityMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(member: CommunityMember): Promise<CommunityMember> {
    const primitives = member.toPrimitives();

    const saved = await this.prisma.community_member.create({
      data: {
        id: primitives.id,
        community_id: primitives.communityId,
        user_id: primitives.userId,
        role: primitives.role,
        status: primitives.status,
        joined_at: primitives.joinedAt,
        updated_at: primitives.updatedAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<CommunityMember | null> {
    const member = await this.prisma.community_member.findUnique({
      where: {
        community_id_user_id: {
          community_id: communityId,
          user_id: userId,
        },
      },
    });

    return member ? this.mapToDomain(member) : null;
  }

  async findByCommunityId(communityId: string): Promise<CommunityMember[]> {
    const members = await this.prisma.community_member.findMany({
      where: { community_id: communityId },
      orderBy: { joined_at: 'asc' },
    });

    return members.map((m) => this.mapToDomain(m));
  }

  async findActiveByCommunityId(
    communityId: string,
  ): Promise<CommunityMember[]> {
    const members = await this.prisma.community_member.findMany({
      where: {
        community_id: communityId,
        status: MembershipStatus.ACTIVE,
      },
      orderBy: { joined_at: 'asc' },
    });

    return members.map((m) => this.mapToDomain(m));
  }

  async findByUserId(userId: string): Promise<CommunityMember[]> {
    const members = await this.prisma.community_member.findMany({
      where: { user_id: userId },
      orderBy: { joined_at: 'desc' },
    });

    return members.map((m) => this.mapToDomain(m));
  }

  async findActiveByUserId(userId: string): Promise<CommunityMember[]> {
    const members = await this.prisma.community_member.findMany({
      where: {
        user_id: userId,
        status: MembershipStatus.ACTIVE,
      },
      orderBy: { joined_at: 'desc' },
    });

    return members.map((m) => this.mapToDomain(m));
  }

  async findPendingByCommunityId(
    communityId: string,
  ): Promise<CommunityMember[]> {
    const members = await this.prisma.community_member.findMany({
      where: {
        community_id: communityId,
        status: MembershipStatus.PENDING,
      },
      orderBy: { joined_at: 'asc' },
    });

    return members.map((m) => this.mapToDomain(m));
  }

  async updateStatus(
    memberId: string,
    status: MembershipStatus,
  ): Promise<CommunityMember> {
    const updated = await this.prisma.community_member.update({
      where: { id: memberId },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    return this.mapToDomain(updated);
  }

  async updateRole(
    memberId: string,
    role: MemberRole,
  ): Promise<CommunityMember> {
    const updated = await this.prisma.community_member.update({
      where: { id: memberId },
      data: {
        role,
        updated_at: new Date(),
      },
    });

    return this.mapToDomain(updated);
  }

  async delete(memberId: string): Promise<void> {
    await this.prisma.community_member.delete({
      where: { id: memberId },
    });
  }

  async findById(memberId: string): Promise<CommunityMember | null> {
    const member = await this.prisma.community_member.findUnique({
      where: { id: memberId },
    });

    return member ? this.mapToDomain(member) : null;
  }

  async countActiveByCommunityId(communityId: string): Promise<number> {
    return this.prisma.community_member.count({
      where: {
        community_id: communityId,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  /**
   * Mapea los datos de Prisma a la entidad de dominio
   */
  private mapToDomain(data: any): CommunityMember {
    return CommunityMember.fromPrimitives({
      id: data.id,
      communityId: data.community_id,
      userId: data.user_id,
      role: data.role as MemberRole,
      status: data.status as MembershipStatus,
      joinedAt: data.joined_at,
      updatedAt: data.updated_at,
    });
  }
}
