export const DELETE_COMMUNITY_USECASE = 'DELETE_COMMUNITY_USECASE';

/**
 * Puerto de entrada para eliminar una comunidad
 */
export interface DeleteCommunityUseCase {
  /**
   * Elimina una comunidad
   * @param userId ID del usuario que solicita la eliminación
   * @param communityId ID de la comunidad a eliminar
   */
  execute(userId: string, communityId: string): Promise<void>;
}
