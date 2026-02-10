import { CommunityMember } from '../../entities/community-member.entity';
import { MemberRole } from '../../enums/member-role.enum';
import { MembershipStatus } from '../../enums/membership-status.enum';

export const COMMUNITY_MEMBER_REPOSITORY_PORT =
  'COMMUNITY_MEMBER_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de miembros de comunidad
 */
export interface CommunityMemberRepository {
  /**
   * Guarda un nuevo miembro
   */
  save(member: CommunityMember): Promise<CommunityMember>;

  /**
   * Busca un miembro por usuario y comunidad
   */
  findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<CommunityMember | null>;

  /**
   * Obtiene todos los miembros de una comunidad
   */
  findByCommunityId(communityId: string): Promise<CommunityMember[]>;

  /**
   * Obtiene todos los miembros activos de una comunidad
   */
  findActiveByCommunityId(communityId: string): Promise<CommunityMember[]>;

  /**
   * Obtiene todas las membresías de un usuario
   */
  findByUserId(userId: string): Promise<CommunityMember[]>;

  /**
   * Obtiene todas las membresías activas de un usuario
   */
  findActiveByUserId(userId: string): Promise<CommunityMember[]>;

  /**
   * Obtiene los miembros pendientes de aprobación de una comunidad
   */
  findPendingByCommunityId(communityId: string): Promise<CommunityMember[]>;

  /**
   * Actualiza el estado de un miembro
   */
  updateStatus(
    memberId: string,
    status: MembershipStatus,
  ): Promise<CommunityMember>;

  /**
   * Actualiza el rol de un miembro
   */
  updateRole(memberId: string, role: MemberRole): Promise<CommunityMember>;

  /**
   * Elimina un miembro
   */
  delete(memberId: string): Promise<void>;

  /**
   * Busca un miembro por su ID
   */
  findById(memberId: string): Promise<CommunityMember | null>;

  /**
   * Cuenta los miembros activos de una comunidad
   */
  countActiveByCommunityId(communityId: string): Promise<number>;
}
