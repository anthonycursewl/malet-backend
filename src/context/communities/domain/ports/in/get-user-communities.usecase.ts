import { Community } from '../../entities/community.entity';

export const GET_USER_COMMUNITIES_USECASE = 'GET_USER_COMMUNITIES_USECASE';

/**
 * Resultado de obtener las comunidades de un usuario
 */
export interface GetUserCommunitiesResult {
    /** Comunidades de las que el usuario es miembro */
    memberships: Community[];
    /** Comunidades de las que el usuario es owner */
    owned: Community[];
}

/**
 * Puerto de entrada para obtener las comunidades de un usuario
 */
export interface GetUserCommunitiesUseCase {
    /**
     * Obtiene las comunidades a las que pertenece un usuario
     * @param userId ID del usuario
     */
    execute(userId: string): Promise<GetUserCommunitiesResult>;
}
