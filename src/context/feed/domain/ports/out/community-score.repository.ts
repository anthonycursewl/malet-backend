import { CommunityScore } from '../../entities/community-score.entity';

export const COMMUNITY_SCORE_REPOSITORY_PORT = 'COMMUNITY_SCORE_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de scores de comunidades
 */
export interface CommunityScoreRepository {
    /**
     * Guarda o actualiza un score
     */
    upsert(score: CommunityScore): Promise<CommunityScore>;

    /**
     * Guarda múltiples scores
     */
    upsertMany(scores: CommunityScore[]): Promise<void>;

    /**
     * Obtiene los scores de un usuario ordenados por score
     */
    findByUserIdOrderByScore(
        userId: string,
        limit: number,
        offset: number
    ): Promise<CommunityScore[]>;

    /**
     * Obtiene el score de una comunidad específica para un usuario
     */
    findByUserAndCommunity(userId: string, communityId: string): Promise<CommunityScore | null>;

    /**
     * Elimina scores antiguos (para limpieza de cache)
     */
    deleteOlderThan(date: Date): Promise<number>;

    /**
     * Cuenta los scores de un usuario
     */
    countByUserId(userId: string): Promise<number>;
}
