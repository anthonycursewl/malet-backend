import { Community } from '../../entities/community.entity';

export const GET_COMMUNITY_USECASE = 'GET_COMMUNITY_USECASE';

/**
 * Puerto de entrada para obtener una comunidad
 */
export interface GetCommunityUseCase {
  /**
   * Obtiene una comunidad por su ID o slug
   * @param idOrSlug ID o slug de la comunidad
   */
  execute(idOrSlug: string): Promise<Community | null>;
}
