export const LEAVE_COMMUNITY_USECASE = 'LEAVE_COMMUNITY_USECASE';

/**
 * Puerto de entrada para abandonar una comunidad
 */
export interface LeaveCommunityUseCase {
  /**
   * Permite a un usuario abandonar una comunidad
   * @param userId ID del usuario que quiere salir
   * @param communityId ID de la comunidad
   */
  execute(userId: string, communityId: string): Promise<void>;
}
