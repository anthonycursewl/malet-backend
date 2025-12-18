import { UserInterest } from '../../entities/user-interest.entity';

export const SAVE_USER_INTERESTS_USECASE = 'SAVE_USER_INTERESTS_USECASE';

/**
 * Parámetros para guardar intereses
 */
export interface SaveUserInterestsParams {
    categoryIds: string[];
}

/**
 * Resultado de guardar intereses
 */
export interface SaveUserInterestsResult {
    interests: UserInterest[];
    count: number;
}

/**
 * Puerto de entrada para guardar los intereses del usuario
 */
export interface SaveUserInterestsUseCase {
    /**
     * Guarda los intereses seleccionados por el usuario durante el onboarding
     * @param userId ID del usuario
     * @param params Categorías seleccionadas
     */
    execute(userId: string, params: SaveUserInterestsParams): Promise<SaveUserInterestsResult>;
}
