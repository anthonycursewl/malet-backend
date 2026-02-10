import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CommunityScoreRepository } from '../../domain/ports/out/community-score.repository';
import { CommunityScore } from '../../domain/entities/community-score.entity';

@Injectable()
export class CommunityScoreRepositoryAdapter implements CommunityScoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(score: CommunityScore): Promise<CommunityScore> {
    const primitives = score.toPrimitives();

    const saved = await this.prisma.user_community_score.upsert({
      where: {
        user_id_community_id: {
          user_id: primitives.userId,
          community_id: primitives.communityId,
        },
      },
      update: {
        score: primitives.score,
        interest_score: primitives.interestScore,
        popularity_score: primitives.popularityScore,
        freshness_score: primitives.freshnessScore,
        engagement_score: primitives.engagementScore,
        reasons: JSON.stringify(primitives.reasons),
        calculated_at: primitives.calculatedAt,
      },
      create: {
        user_id: primitives.userId,
        community_id: primitives.communityId,
        score: primitives.score,
        interest_score: primitives.interestScore,
        popularity_score: primitives.popularityScore,
        freshness_score: primitives.freshnessScore,
        engagement_score: primitives.engagementScore,
        reasons: JSON.stringify(primitives.reasons),
        calculated_at: primitives.calculatedAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async upsertMany(scores: CommunityScore[]): Promise<void> {
    for (const score of scores) {
      await this.upsert(score);
    }
  }

  async findByUserIdOrderByScore(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<CommunityScore[]> {
    const scores = await this.prisma.user_community_score.findMany({
      where: { user_id: userId },
      orderBy: { score: 'desc' },
      skip: offset,
      take: limit,
    });

    return scores.map((s) => this.mapToDomain(s));
  }

  async findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<CommunityScore | null> {
    const score = await this.prisma.user_community_score.findUnique({
      where: {
        user_id_community_id: {
          user_id: userId,
          community_id: communityId,
        },
      },
    });

    return score ? this.mapToDomain(score) : null;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.user_community_score.deleteMany({
      where: { calculated_at: { lt: date } },
    });

    return result.count;
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.user_community_score.count({
      where: { user_id: userId },
    });
  }

  private mapToDomain(data: any): CommunityScore {
    return CommunityScore.fromPrimitives({
      userId: data.user_id,
      communityId: data.community_id,
      score: data.score,
      interestScore: data.interest_score,
      popularityScore: data.popularity_score,
      freshnessScore: data.freshness_score,
      engagementScore: data.engagement_score,
      reasons: data.reasons ? JSON.parse(data.reasons) : [],
      calculatedAt: data.calculated_at,
    });
  }
}
