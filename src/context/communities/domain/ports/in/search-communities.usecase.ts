import { Community } from '../../entities/community.entity';
import { CommunityType } from '../../enums/community-type.enum';

export const SEARCH_COMMUNITIES_USECASE = 'SEARCH_COMMUNITIES_USECASE';

/**
 * Parámetros para buscar comunidades
 */
export interface SearchCommunitiesParams {
  query?: string;
  type?: CommunityType;
  page?: number;
  limit?: number;
}

/**
 * Resultado de la búsqueda de comunidades
 */
export interface SearchCommunitiesResult {
  communities: Community[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Puerto de entrada para buscar comunidades
 */
export interface SearchCommunitiesUseCase {
  execute(params: SearchCommunitiesParams): Promise<SearchCommunitiesResult>;
}
