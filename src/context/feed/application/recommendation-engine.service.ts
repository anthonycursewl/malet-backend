import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CommunityScore } from '../domain/entities/community-score.entity';
import {
  USER_INTEREST_REPOSITORY_PORT,
  UserInterestRepository,
} from 'src/context/onboarding/domain/ports/out/user-interest.repository';

/**
 * Configuración del engine de recomendación.
 * Extraído para facilitar A/B testing y ajustes futuros.
 */
export interface RecommendationConfig {
  weights: {
    interestMatch: number;
    popularity: number;
    freshness: number;
    engagement: number;
  };
  freshnessDecayHours: number;
  popularityMaxMembers: number;
  scoreCacheTtlHours: number;
}

/**
 * Configuración por defecto del engine
 */
export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  weights: {
    interestMatch: 0.45, // 45% - Coincidencia de intereses
    popularity: 0.25, // 25% - Popularidad de la comunidad
    freshness: 0.15, // 15% - Actividad reciente
    engagement: 0.15, // 15% - Tasa de engagement
  },
  freshnessDecayHours: 24, // Decay de freshness en 24 horas
  popularityMaxMembers: 10000, // Máximo de miembros para score máximo
  scoreCacheTtlHours: 6, // Cache de scores por 6 horas
};

/**
 * Resultado del cálculo de score
 */
export interface ScoreBreakdown {
  interestScore: number;
  popularityScore: number;
  freshnessScore: number;
  engagementScore: number;
  totalScore: number;
  reasons: string[];
}

/**
 * Información de comunidad para el cálculo
 */
interface CommunityData {
  id: string;
  name: string;
  memberCount: number;
  isActive: boolean;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  categoryIds: string[];
}

/**
 * Motor de Recomendación para comunidades.
 *
 * Implementa un algoritmo multicriteria para calcular el score de relevancia
 * de comunidades para cada usuario, basándose en sus intereses y comportamiento.
 *
 * El algoritmo es **extensible** y está diseñado para:
 * - Fácil ajuste de pesos (A/B testing)
 * - Agregar nuevos factores de scoring
 * - Implementar diferentes estrategias de recomendación
 */
@Injectable()
export class RecommendationEngineService {
  private config: RecommendationConfig;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_INTEREST_REPOSITORY_PORT)
    private readonly userInterestRepository: UserInterestRepository,
  ) {
    this.config = DEFAULT_RECOMMENDATION_CONFIG;
  }

  /**
   * Permite actualizar la configuración en runtime (útil para A/B testing)
   */
  updateConfig(config: Partial<RecommendationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calcula el score de una comunidad para un usuario específico
   */
  async calculateScore(
    userId: string,
    community: CommunityData,
  ): Promise<CommunityScore> {
    const breakdown = await this.calculateScoreBreakdown(userId, community);

    return CommunityScore.fromPrimitives({
      userId,
      communityId: community.id,
      score: breakdown.totalScore,
      interestScore: breakdown.interestScore,
      popularityScore: breakdown.popularityScore,
      freshnessScore: breakdown.freshnessScore,
      engagementScore: breakdown.engagementScore,
      reasons: breakdown.reasons,
      calculatedAt: new Date(),
    });
  }

  /**
   * Calcula scores para múltiples comunidades (batch)
   */
  async calculateScoresForCommunities(
    userId: string,
    communities: CommunityData[],
  ): Promise<CommunityScore[]> {
    const scores: CommunityScore[] = [];

    for (const community of communities) {
      const score = await this.calculateScore(userId, community);
      scores.push(score);
    }

    return scores.sort((a, b) => b.getScore() - a.getScore());
  }

  /**
   * Calcula el breakdown detallado del score
   */
  async calculateScoreBreakdown(
    userId: string,
    community: CommunityData,
  ): Promise<ScoreBreakdown> {
    // Calcular cada factor en paralelo
    const [interestScore, popularityScore, freshnessScore, engagementScore] =
      await Promise.all([
        this.calculateInterestMatch(userId, community.categoryIds),
        this.calculatePopularity(community.memberCount),
        this.calculateFreshness(community.updatedAt),
        this.calculateEngagement(community.id),
      ]);

    // Aplicar pesos
    const weightedScore =
      interestScore * this.config.weights.interestMatch +
      popularityScore * this.config.weights.popularity +
      freshnessScore * this.config.weights.freshness +
      engagementScore * this.config.weights.engagement;

    // Normalizar a 0-100
    const totalScore = Math.min(100, Math.max(0, weightedScore));

    // Generar razones
    const reasons = this.generateReasons(
      {
        interestScore,
        popularityScore,
        freshnessScore,
        engagementScore,
      },
      community.name,
    );

    return {
      interestScore,
      popularityScore,
      freshnessScore,
      engagementScore,
      totalScore,
      reasons,
    };
  }

  /**
   * Calcula la coincidencia de intereses del usuario con la comunidad
   *
   * Fórmula: (Σ peso_interés_coincidente) / (Σ peso_total_usuario) * 100
   */
  private async calculateInterestMatch(
    userId: string,
    communityCategoryIds: string[],
  ): Promise<number> {
    if (communityCategoryIds.length === 0) {
      return 50; // Score neutral si la comunidad no tiene categorías
    }

    // Obtener intereses del usuario
    const userInterests =
      await this.userInterestRepository.findByUserId(userId);

    if (userInterests.length === 0) {
      return 50; // Score neutral si el usuario no tiene intereses
    }

    // Calcular coincidencias ponderadas
    const userCategoryWeights = new Map<string, number>();
    let totalWeight = 0;

    for (const interest of userInterests) {
      userCategoryWeights.set(interest.getCategoryId(), interest.getWeight());
      totalWeight += interest.getWeight();
    }

    // Sumar pesos de categorías que coinciden
    let matchWeight = 0;
    for (const categoryId of communityCategoryIds) {
      if (userCategoryWeights.has(categoryId)) {
        matchWeight += userCategoryWeights.get(categoryId)!;
      }
    }

    // Normalizar a 0-100
    return (matchWeight / totalWeight) * 100;
  }

  /**
   * Calcula el score de popularidad basado en número de miembros
   *
   * Usa escala logarítmica para evitar que comunidades muy grandes dominen
   */
  private async calculatePopularity(memberCount: number): Promise<number> {
    if (memberCount <= 0) return 0;

    // Escala logarítmica con máximo en config.popularityMaxMembers
    const logScore = Math.log10(memberCount + 1);
    const logMax = Math.log10(this.config.popularityMaxMembers + 1);

    return Math.min(100, (logScore / logMax) * 100);
  }

  /**
   * Calcula el score de frescura basado en última actividad
   *
   * Usa decay exponencial: score = 100 * e^(-horas/decay)
   */
  private async calculateFreshness(lastActivity: Date): Promise<number> {
    const hoursSinceActivity =
      (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

    // Decay exponencial
    return (
      100 * Math.exp(-hoursSinceActivity / this.config.freshnessDecayHours)
    );
  }

  /**
   * Calcula el score de engagement de la comunidad
   *
   * Basado en ratio de miembros activos vs totales (últimos 7 días)
   */
  private async calculateEngagement(communityId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      // Contar interacciones en los últimos 7 días
      const interactionCount = await this.prisma.user_interaction.count({
        where: {
          community_id: communityId,
          created_at: { gte: sevenDaysAgo },
        },
      });

      // Obtener número de miembros
      const community = await this.prisma.community.findUnique({
        where: { id: communityId },
        select: { member_count: true },
      });

      if (!community || community.member_count === 0) {
        return 50; // Score neutral
      }

      // Ratio de interacciones por miembro
      const engagementRatio = interactionCount / community.member_count;

      // Normalizar a 0-100 (asumiendo que 1 interacción/miembro = 100%)
      return Math.min(100, engagementRatio * 100);
    } catch (_error) {
      return 50; // Score neutral en caso de error
    }
  }

  /**
   * Genera razones legibles para el usuario sobre por qué se recomienda
   */
  private generateReasons(
    scores: {
      interestScore: number;
      popularityScore: number;
      freshnessScore: number;
      engagementScore: number;
    },
    _communityName: string,
  ): string[] {
    const reasons: string[] = [];

    if (scores.interestScore >= 70) {
      reasons.push('Coincide con tus intereses');
    } else if (scores.interestScore >= 40) {
      reasons.push('Puede interesarte');
    }

    if (scores.popularityScore >= 70) {
      reasons.push('Comunidad popular');
    }

    if (scores.freshnessScore >= 80) {
      reasons.push('Muy activa recientemente');
    } else if (scores.freshnessScore >= 50) {
      reasons.push('Activa');
    }

    if (scores.engagementScore >= 70) {
      reasons.push('Alta participación');
    }

    // Si no hay razones específicas, agregar genérica
    if (reasons.length === 0) {
      reasons.push('Descubre algo nuevo');
    }

    return reasons;
  }

  /**
   * Obtiene comunidades con sus categorías para el cálculo
   */
  async getCommunityDataForCalculation(
    communityIds: string[],
  ): Promise<CommunityData[]> {
    const communities = await this.prisma.community.findMany({
      where: {
        id: { in: communityIds },
        is_active: true,
      },
      include: {
        interests: {
          select: { category_id: true },
        },
      },
    });

    return communities.map((c) => ({
      id: c.id,
      name: c.name,
      memberCount: c.member_count,
      isActive: c.is_active,
      type: c.type,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      categoryIds: c.interests.map((i) => i.category_id),
    }));
  }

  /**
   * Obtiene todas las comunidades activas y calcula scores para un usuario
   */
  async calculateScoresForAllCommunities(
    userId: string,
    excludeJoinedCommunities: boolean = true,
  ): Promise<CommunityScore[]> {
    // Obtener IDs de comunidades a las que ya pertenece el usuario
    let excludedIds: string[] = [];
    if (excludeJoinedCommunities) {
      const memberships = await this.prisma.community_member.findMany({
        where: { user_id: userId },
        select: { community_id: true },
      });
      excludedIds = memberships.map((m) => m.community_id);
    }

    // Obtener comunidades activas
    const communities = await this.prisma.community.findMany({
      where: {
        is_active: true,
        id: { notIn: excludedIds },
      },
      include: {
        interests: {
          select: { category_id: true },
        },
      },
    });

    const communityData: CommunityData[] = communities.map((c) => ({
      id: c.id,
      name: c.name,
      memberCount: c.member_count,
      isActive: c.is_active,
      type: c.type,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      categoryIds: c.interests.map((i) => i.category_id),
    }));

    return this.calculateScoresForCommunities(userId, communityData);
  }
}
