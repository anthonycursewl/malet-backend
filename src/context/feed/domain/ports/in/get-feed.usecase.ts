import { Community } from 'src/context/communities/domain/entities/community.entity';
import { CommunityScore } from '../../entities/community-score.entity';

export const GET_FEED_USECASE = 'GET_FEED_USECASE';

/**
 * Parámetros para obtener el feed
 */
export interface GetFeedParams {
  page?: number;
  limit?: number;
  excludeJoined?: boolean;
}

/**
 * Elemento del feed
 */
export interface FeedItem {
  community: Community;
  score: CommunityScore;
  reasons: string[];
}

/**
 * Resultado del feed
 */
export interface FeedResult {
  items: FeedItem[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Puerto de entrada para obtener el feed personalizado
 */
export interface GetFeedUseCase {
  /**
   * Obtiene el feed personalizado para un usuario
   */
  execute(userId: string, params?: GetFeedParams): Promise<FeedResult>;

  /**
   * Obtiene comunidades trending (sin personalización)
   */
  getTrending(params?: GetFeedParams): Promise<FeedResult>;

  /**
   * Obtiene comunidades para explorar
   */
  getExplore(params?: GetFeedParams): Promise<FeedResult>;
}
