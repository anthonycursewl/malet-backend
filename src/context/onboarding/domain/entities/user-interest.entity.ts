/**
 * Fuentes posibles de un interés
 */
export type InterestSource = 'onboarding' | 'interaction' | 'explicit';

/**
 * Primitivas de la entidad UserInterest
 */
export interface UserInterestPrimitives {
    id: string;
    userId: string;
    categoryId: string;
    weight: number;
    source: InterestSource;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Entidad de dominio UserInterest
 * Representa un interés del usuario en una categoría
 */
export class UserInterest {
    private readonly id: string;
    private readonly userId: string;
    private readonly categoryId: string;
    private readonly weight: number;
    private readonly source: InterestSource;
    private readonly createdAt: Date;
    private readonly updatedAt: Date;

    constructor(params: UserInterestPrimitives) {
        this.id = params.id;
        this.userId = params.userId;
        this.categoryId = params.categoryId;
        this.weight = params.weight;
        this.source = params.source;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
    }

    /**
     * Crea un nuevo interés desde onboarding
     */
    static createFromOnboarding(userId: string, categoryId: string): UserInterest {
        return new UserInterest({
            id: crypto.randomUUID().split('-')[4],
            userId,
            categoryId,
            weight: 1.0,
            source: 'onboarding',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    /**
     * Crea un interés inferido de interacciones
     */
    static createFromInteraction(userId: string, categoryId: string, weight: number = 0.5): UserInterest {
        return new UserInterest({
            id: crypto.randomUUID().split('-')[4],
            userId,
            categoryId,
            weight,
            source: 'interaction',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // Getters
    getId(): string { return this.id; }
    getUserId(): string { return this.userId; }
    getCategoryId(): string { return this.categoryId; }
    getWeight(): number { return this.weight; }
    getSource(): InterestSource { return this.source; }
    getCreatedAt(): Date { return this.createdAt; }
    getUpdatedAt(): Date { return this.updatedAt; }

    /**
     * Crea una copia con peso actualizado
     */
    withUpdatedWeight(newWeight: number): UserInterest {
        return new UserInterest({
            ...this.toPrimitives(),
            weight: Math.max(0, Math.min(2, newWeight)), // Clamp entre 0 y 2
            updatedAt: new Date()
        });
    }

    toPrimitives(): UserInterestPrimitives {
        return {
            id: this.id,
            userId: this.userId,
            categoryId: this.categoryId,
            weight: this.weight,
            source: this.source,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromPrimitives(primitives: UserInterestPrimitives): UserInterest {
        return new UserInterest(primitives);
    }
}
