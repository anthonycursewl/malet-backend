import { Community } from '../../entities/community.entity';
import { CommunityType } from '../../enums/community-type.enum';

export const COMMUNITY_REPOSITORY_PORT = 'COMMUNITY_REPOSITORY_PORT';

/**
 * Parámetros para buscar comunidades
 */
export interface CommunitySearchParams {
  query?: string;
  type?: CommunityType;
  page: number;
  limit: number;
}

/**
 * Resultado de la búsqueda de comunidades
 */
export interface CommunitySearchResult {
  communities: Community[];
  total: number;
}

/**
 * Parámetros para actualizar una comunidad
 */
export interface UpdateCommunityData {
  name?: string;
  description?: string | null;
  type?: CommunityType;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  isActive?: boolean;
}

/**
 * Puerto de salida para el repositorio de comunidades
 */
export interface CommunityRepository {
  /**
   * Guarda una nueva comunidad
   */
  save(community: Community): Promise<Community>;

  /**
   * Busca una comunidad por su ID
   */
  findById(id: string): Promise<Community | null>;

  /**
   * Busca una comunidad por su slug
   */
  findBySlug(slug: string): Promise<Community | null>;

  /**
   * Obtiene todas las comunidades de un owner
   */
  findByOwnerId(ownerId: string): Promise<Community[]>;

  /**
   * Busca comunidades con filtros y paginación
   */
  search(params: CommunitySearchParams): Promise<CommunitySearchResult>;

  /**
   * Actualiza una comunidad existente
   */
  update(id: string, data: UpdateCommunityData): Promise<Community>;

  /**
   * Elimina una comunidad
   */
  delete(id: string): Promise<void>;

  /**
   * Incrementa el contador de miembros
   */
  incrementMemberCount(id: string): Promise<void>;

  /**
   * Decrementa el contador de miembros
   */
  decrementMemberCount(id: string): Promise<void>;

  /**
   * Verifica si existe una comunidad con el slug dado
   */
  existsBySlug(slug: string): Promise<boolean>;
}
