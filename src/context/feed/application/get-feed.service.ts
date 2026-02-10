import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  GetFeedUseCase,
  GetFeedParams,
  FeedResult,
  FeedItem,
} from '../domain/ports/in/get-feed.usecase';
import {
  COMMUNITY_SCORE_REPOSITORY_PORT,
  CommunityScoreRepository,
} from '../domain/ports/out/community-score.repository';
import { RecommendationEngineService } from './recommendation-engine.service';
import { Community } from 'src/context/communities/domain/entities/community.entity';
import { CommunityType } from 'src/context/communities/domain/enums/community-type.enum';

@Injectable()
export class GetFeedService implements GetFeedUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationEngine: RecommendationEngineService,
    @Inject(COMMUNITY_SCORE_REPOSITORY_PORT)
    private readonly scoreRepository: CommunityScoreRepository,
  ) {}

  async execute(userId: string, params?: GetFeedParams): Promise<FeedResult> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 50);
    const excludeJoined = params?.excludeJoined !== false;

    // Calcular scores para todas las comunidades
    const scores =
      await this.recommendationEngine.calculateScoresForAllCommunities(
        userId,
        excludeJoined,
      );

    // Guardar scores en cache
    if (scores.length > 0) {
      await this.scoreRepository.upsertMany(scores);
    }

    // Paginar resultados
    const total = scores.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedScores = scores.slice(offset, offset + limit);

    // Obtener datos completos de las comunidades
    const communityIds = paginatedScores.map((s) => s.getCommunityId());
    const communitiesData = await this.prisma.community.findMany({
      where: { id: { in: communityIds } },
    });

    // Mapear a entidades de dominio y crear items del feed
    const communityMap = new Map(communitiesData.map((c) => [c.id, c]));
    const items: FeedItem[] = paginatedScores
      .map((score) => {
        const data = communityMap.get(score.getCommunityId());
        if (!data) return null;

        const community = Community.fromPrimitives({
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

        return {
          community,
          score,
          reasons: score.getReasons(),
        };
      })
      .filter((item): item is FeedItem => item !== null);

    return {
      items,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getTrending(params?: GetFeedParams): Promise<FeedResult> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 50);
    const offset = (page - 1) * limit;

    // Trending = comunidades con más miembros y actividad reciente
    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where: { is_active: true },
        orderBy: [{ member_count: 'desc' }, { updated_at: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.community.count({ where: { is_active: true } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const items: FeedItem[] = communities.map((data) => {
      const community = Community.fromPrimitives({
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

      // Score simplificado para trending
      const score = {
        getUserId: () => '',
        getCommunityId: () => data.id,
        getScore: () => data.member_count,
        getInterestScore: () => 0,
        getPopularityScore: () => 100,
        getFreshnessScore: () => 50,
        getEngagementScore: () => 50,
        getReasons: () => ['Trending'],
        getCalculatedAt: () => new Date(),
        isFresh: () => true,
        toPrimitives: () => ({
          userId: '',
          communityId: data.id,
          score: data.member_count,
          interestScore: 0,
          popularityScore: 100,
          freshnessScore: 50,
          engagementScore: 50,
          reasons: ['Trending'],
          calculatedAt: new Date(),
        }),
      } as any;

      return {
        community,
        score,
        reasons: ['Trending'],
      };
    });

    return {
      items,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  async getExplore(params?: GetFeedParams): Promise<FeedResult> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 50);
    const offset = (page - 1) * limit;

    // Explore = comunidades ordenadas aleatoriamente (para descubrir)
    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.community.count({ where: { is_active: true } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const items: FeedItem[] = communities.map((data) => {
      const community = Community.fromPrimitives({
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

      // Score genérico para explore
      const score = {
        getUserId: () => '',
        getCommunityId: () => data.id,
        getScore: () => 50,
        getInterestScore: () => 0,
        getPopularityScore: () => 50,
        getFreshnessScore: () => 50,
        getEngagementScore: () => 50,
        getReasons: () => ['Descubre algo nuevo'],
        getCalculatedAt: () => new Date(),
        isFresh: () => true,
        toPrimitives: () => ({
          userId: '',
          communityId: data.id,
          score: 50,
          interestScore: 0,
          popularityScore: 50,
          freshnessScore: 50,
          engagementScore: 50,
          reasons: ['Descubre algo nuevo'],
          calculatedAt: new Date(),
        }),
      } as any;

      return {
        community,
        score,
        reasons: ['Descubre algo nuevo'],
      };
    });

    return {
      items,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }
}
