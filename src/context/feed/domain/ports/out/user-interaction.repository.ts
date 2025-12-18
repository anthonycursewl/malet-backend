import { UserInteraction, InteractionType } from '../../entities/user-interaction.entity';

export const USER_INTERACTION_REPOSITORY_PORT = 'USER_INTERACTION_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de interacciones
 */
export interface UserInteractionRepository {
    /**
     * Guarda una interacción
     */
    save(interaction: UserInteraction): Promise<UserInteraction>;

    /**
     * Guarda múltiples interacciones
     */
    saveMany(interactions: UserInteraction[]): Promise<void>;

    /**
     * Obtiene interacciones de un usuario
     */
    findByUserId(userId: string, limit?: number): Promise<UserInteraction[]>;

    /**
     * Obtiene interacciones de un usuario con una comunidad específica
     */
    findByUserAndCommunity(userId: string, communityId: string): Promise<UserInteraction[]>;

    /**
     * Cuenta interacciones por tipo para una comunidad
     */
    countByCommunityAndType(communityId: string, interaction: InteractionType): Promise<number>;

    /**
     * Obtiene las últimas interacciones de un tipo para un usuario
     */
    findRecentByUserAndType(
        userId: string,
        interaction: InteractionType,
        since: Date
    ): Promise<UserInteraction[]>;
}
