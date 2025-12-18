/**
 * Primitivas de la entidad CommunityScore
 */
export interface CommunityScorePrimitives {
    userId: string;
    communityId: string;
    score: number;
    interestScore: number;
    popularityScore: number;
    freshnessScore: number;
    engagementScore: number;
    reasons: string[];
    calculatedAt: Date;
}

/**
 * Entidad de dominio CommunityScore
 * Representa el score calculado de una comunidad para un usuario específico
 */
export class CommunityScore {
    private readonly userId: string;
    private readonly communityId: string;
    private readonly score: number;
    private readonly interestScore: number;
    private readonly popularityScore: number;
    private readonly freshnessScore: number;
    private readonly engagementScore: number;
    private readonly reasons: string[];
    private readonly calculatedAt: Date;

    constructor(params: CommunityScorePrimitives) {
        this.userId = params.userId;
        this.communityId = params.communityId;
        this.score = params.score;
        this.interestScore = params.interestScore;
        this.popularityScore = params.popularityScore;
        this.freshnessScore = params.freshnessScore;
        this.engagementScore = params.engagementScore;
        this.reasons = params.reasons;
        this.calculatedAt = params.calculatedAt;
    }

    // Getters
    getUserId(): string { return this.userId; }
    getCommunityId(): string { return this.communityId; }
    getScore(): number { return this.score; }
    getInterestScore(): number { return this.interestScore; }
    getPopularityScore(): number { return this.popularityScore; }
    getFreshnessScore(): number { return this.freshnessScore; }
    getEngagementScore(): number { return this.engagementScore; }
    getReasons(): string[] { return [...this.reasons]; }
    getCalculatedAt(): Date { return this.calculatedAt; }

    /**
     * Verifica si el score está fresco (menos de 6 horas)
     */
    isFresh(hoursThreshold: number = 6): boolean {
        const ageMs = Date.now() - this.calculatedAt.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        return ageHours < hoursThreshold;
    }

    toPrimitives(): CommunityScorePrimitives {
        return {
            userId: this.userId,
            communityId: this.communityId,
            score: this.score,
            interestScore: this.interestScore,
            popularityScore: this.popularityScore,
            freshnessScore: this.freshnessScore,
            engagementScore: this.engagementScore,
            reasons: [...this.reasons],
            calculatedAt: this.calculatedAt
        };
    }

    static fromPrimitives(primitives: CommunityScorePrimitives): CommunityScore {
        return new CommunityScore(primitives);
    }
}
