/**
 * Tipos de interacción del usuario con comunidades
 */
export type InteractionType = 'view' | 'join' | 'leave' | 'like' | 'share' | 'dismiss' | 'click';

/**
 * Primitivas de la entidad UserInteraction
 */
export interface UserInteractionPrimitives {
    id: string;
    userId: string;
    communityId: string;
    interaction: InteractionType;
    metadata: Record<string, any> | null;
    createdAt: Date;
}

/**
 * Entidad de dominio UserInteraction
 * Representa una interacción del usuario con una comunidad
 */
export class UserInteraction {
    private readonly id: string;
    private readonly userId: string;
    private readonly communityId: string;
    private readonly interaction: InteractionType;
    private readonly metadata: Record<string, any> | null;
    private readonly createdAt: Date;

    constructor(params: UserInteractionPrimitives) {
        this.id = params.id;
        this.userId = params.userId;
        this.communityId = params.communityId;
        this.interaction = params.interaction;
        this.metadata = params.metadata;
        this.createdAt = params.createdAt;
    }

    static create(
        userId: string,
        communityId: string,
        interaction: InteractionType,
        metadata: Record<string, any> | null = null
    ): UserInteraction {
        return new UserInteraction({
            id: crypto.randomUUID().split('-')[4],
            userId,
            communityId,
            interaction,
            metadata,
            createdAt: new Date()
        });
    }

    // Getters
    getId(): string { return this.id; }
    getUserId(): string { return this.userId; }
    getCommunityId(): string { return this.communityId; }
    getInteraction(): InteractionType { return this.interaction; }
    getMetadata(): Record<string, any> | null { return this.metadata; }
    getCreatedAt(): Date { return this.createdAt; }

    /**
     * Verifica si es una interacción positiva
     */
    isPositive(): boolean {
        return ['join', 'like', 'share', 'click'].includes(this.interaction);
    }

    /**
     * Verifica si es una interacción negativa
     */
    isNegative(): boolean {
        return ['leave', 'dismiss'].includes(this.interaction);
    }

    /**
     * Obtiene el peso de la interacción para ajustar scores
     */
    getWeight(): number {
        const weights: Record<InteractionType, number> = {
            view: 0.1,
            click: 0.2,
            join: 2.0,
            like: 0.5,
            share: 1.0,
            leave: -1.0,
            dismiss: -0.5
        };
        return weights[this.interaction] || 0;
    }

    toPrimitives(): UserInteractionPrimitives {
        return {
            id: this.id,
            userId: this.userId,
            communityId: this.communityId,
            interaction: this.interaction,
            metadata: this.metadata,
            createdAt: this.createdAt
        };
    }

    static fromPrimitives(primitives: UserInteractionPrimitives): UserInteraction {
        return new UserInteraction(primitives);
    }
}
