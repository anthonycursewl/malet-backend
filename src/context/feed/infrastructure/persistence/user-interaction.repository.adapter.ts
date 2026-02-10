import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserInteractionRepository } from '../../domain/ports/out/user-interaction.repository';
import {
  UserInteraction,
  InteractionType,
} from '../../domain/entities/user-interaction.entity';

@Injectable()
export class UserInteractionRepositoryAdapter implements UserInteractionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(interaction: UserInteraction): Promise<UserInteraction> {
    const primitives = interaction.toPrimitives();

    const saved = await this.prisma.user_interaction.create({
      data: {
        id: primitives.id,
        user_id: primitives.userId,
        community_id: primitives.communityId,
        interaction: primitives.interaction,
        metadata: primitives.metadata
          ? JSON.stringify(primitives.metadata)
          : null,
        created_at: primitives.createdAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async saveMany(interactions: UserInteraction[]): Promise<void> {
    const data = interactions.map((i) => {
      const primitives = i.toPrimitives();
      return {
        id: primitives.id,
        user_id: primitives.userId,
        community_id: primitives.communityId,
        interaction: primitives.interaction,
        metadata: primitives.metadata
          ? JSON.stringify(primitives.metadata)
          : null,
        created_at: primitives.createdAt,
      };
    });

    await this.prisma.user_interaction.createMany({ data });
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
  ): Promise<UserInteraction[]> {
    const interactions = await this.prisma.user_interaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return interactions.map((i) => this.mapToDomain(i));
  }

  async findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<UserInteraction[]> {
    const interactions = await this.prisma.user_interaction.findMany({
      where: {
        user_id: userId,
        community_id: communityId,
      },
      orderBy: { created_at: 'desc' },
    });

    return interactions.map((i) => this.mapToDomain(i));
  }

  async countByCommunityAndType(
    communityId: string,
    interaction: InteractionType,
  ): Promise<number> {
    return this.prisma.user_interaction.count({
      where: {
        community_id: communityId,
        interaction,
      },
    });
  }

  async findRecentByUserAndType(
    userId: string,
    interaction: InteractionType,
    since: Date,
  ): Promise<UserInteraction[]> {
    const interactions = await this.prisma.user_interaction.findMany({
      where: {
        user_id: userId,
        interaction,
        created_at: { gte: since },
      },
      orderBy: { created_at: 'desc' },
    });

    return interactions.map((i) => this.mapToDomain(i));
  }

  private mapToDomain(data: any): UserInteraction {
    return UserInteraction.fromPrimitives({
      id: data.id,
      userId: data.user_id,
      communityId: data.community_id,
      interaction: data.interaction as InteractionType,
      metadata: data.metadata ? JSON.parse(data.metadata) : null,
      createdAt: data.created_at,
    });
  }
}
