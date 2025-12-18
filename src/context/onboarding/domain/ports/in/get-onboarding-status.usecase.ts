import { UserOnboarding } from '../../entities/user-onboarding.entity';

export const GET_ONBOARDING_STATUS_USECASE = 'GET_ONBOARDING_STATUS_USECASE';

/**
 * Resultado del estado del onboarding
 */
export interface OnboardingStatusResult {
    onboarding: UserOnboarding;
    needsOnboarding: boolean;
    progress: number;
    nextStep: 'interests' | 'communities' | 'profile' | 'complete';
}

/**
 * Puerto de entrada para obtener el estado del onboarding
 */
export interface GetOnboardingStatusUseCase {
    /**
     * Obtiene el estado del onboarding del usuario
     * @param userId ID del usuario
     */
    execute(userId: string): Promise<OnboardingStatusResult>;
}
