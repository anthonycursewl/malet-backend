import { UserOnboarding } from '../../entities/user-onboarding.entity';

export const USER_ONBOARDING_REPOSITORY_PORT = 'USER_ONBOARDING_REPOSITORY_PORT';

/**
 * Parámetros para actualizar el onboarding
 */
export interface UpdateOnboardingData {
    stepInterests?: boolean;
    stepCommunities?: boolean;
    stepProfile?: boolean;
    completed?: boolean;
    skipped?: boolean;
    completedAt?: Date | null;
}

/**
 * Puerto de salida para el repositorio de onboarding del usuario
 */
export interface UserOnboardingRepository {
    /**
     * Crea un nuevo registro de onboarding
     */
    create(onboarding: UserOnboarding): Promise<UserOnboarding>;

    /**
     * Busca el onboarding de un usuario
     */
    findByUserId(userId: string): Promise<UserOnboarding | null>;

    /**
     * Actualiza el onboarding
     */
    update(userId: string, data: UpdateOnboardingData): Promise<UserOnboarding>;

    /**
     * Obtiene o crea el onboarding para un usuario
     */
    getOrCreate(userId: string): Promise<UserOnboarding>;
}
