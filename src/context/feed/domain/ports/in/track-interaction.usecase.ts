import { UserInteraction, InteractionType } from '../../entities/user-interaction.entity';

export const TRACK_INTERACTION_USECASE = 'TRACK_INTERACTION_USECASE';

/**
 * Parámetros para trackear una interacción
 */
export interface TrackInteractionParams {
    communityId: string;
    interaction: InteractionType;
    metadata?: Record<string, any>;
}

/**
 * Puerto de entrada para trackear interacciones del usuario
 */
export interface TrackInteractionUseCase {
    /**
     * Registra una interacción del usuario con una comunidad
     */
    execute(userId: string, params: TrackInteractionParams): Promise<UserInteraction>;

    /**
     * Registra múltiples views (batch)
     */
    trackViews(userId: string, communityIds: string[]): Promise<void>;
}
