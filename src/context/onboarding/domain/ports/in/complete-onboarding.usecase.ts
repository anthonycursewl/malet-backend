import { UserOnboarding } from '../../entities/user-onboarding.entity';

export const COMPLETE_ONBOARDING_USECASE = 'COMPLETE_ONBOARDING_USECASE';

/**
 * Parámetros para actualizar el onboarding
 */
export interface UpdateOnboardingParams {
    stepInterests?: boolean;
    stepCommunities?: boolean;
    stepProfile?: boolean;
    completed?: boolean;
    skipped?: boolean;
}

/**
 * Puerto de entrada para completar pasos del onboarding
 */
export interface CompleteOnboardingUseCase {
    /**
     * Actualiza el progreso del onboarding
     */
    updateProgress(userId: string, params: UpdateOnboardingParams): Promise<UserOnboarding>;

    /**
     * Marca el onboarding como completado
     */
    complete(userId: string): Promise<UserOnboarding>;

    /**
     * Marca el onboarding como saltado
     */
    skip(userId: string): Promise<UserOnboarding>;
}
