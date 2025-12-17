import { CommunityMember } from '../../entities/community-member.entity';

export const JOIN_COMMUNITY_USECASE = 'JOIN_COMMUNITY_USECASE';

/**
 * Resultado de unirse a una comunidad
 */
export interface JoinCommunityResult {
    member: CommunityMember;
    /** True si el usuario se unió directamente, false si está pendiente de aprobación */
    joined: boolean;
    /** True si la solicitud quedó pendiente */
    pending: boolean;
}

/**
 * Puerto de entrada para unirse a una comunidad
 */
export interface JoinCommunityUseCase {
    /**
     * Une a un usuario a una comunidad
     * @param userId ID del usuario que quiere unirse
     * @param communityId ID de la comunidad
     */
    execute(userId: string, communityId: string): Promise<JoinCommunityResult>;
}
