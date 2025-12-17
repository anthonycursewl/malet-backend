import { CommunityMember } from '../../entities/community-member.entity';
import { MemberRole } from '../../enums/member-role.enum';

export const MANAGE_MEMBERS_USECASE = 'MANAGE_MEMBERS_USECASE';

/**
 * Puerto de entrada para gestionar miembros de una comunidad
 */
export interface ManageMembersUseCase {
    /**
     * Aprueba la solicitud de un miembro pendiente
     */
    approveMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember>;

    /**
     * Rechaza la solicitud de un miembro pendiente
     */
    rejectMember(requesterId: string, communityId: string, memberId: string): Promise<void>;

    /**
     * Expulsa a un miembro de la comunidad
     */
    kickMember(requesterId: string, communityId: string, memberId: string): Promise<void>;

    /**
     * Banea permanentemente a un miembro
     */
    banMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember>;

    /**
     * Desbanea a un miembro
     */
    unbanMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember>;

    /**
     * Cambia el rol de un miembro
     */
    changeRole(requesterId: string, communityId: string, memberId: string, newRole: MemberRole): Promise<CommunityMember>;

    /**
     * Obtiene la lista de miembros pendientes de aprobación
     */
    getPendingMembers(requesterId: string, communityId: string): Promise<CommunityMember[]>;

    /**
     * Obtiene la lista de todos los miembros de una comunidad
     */
    getMembers(communityId: string): Promise<CommunityMember[]>;
}
