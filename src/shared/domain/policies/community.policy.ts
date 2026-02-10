import { Policy, AuthenticatedUser } from './policy.interface';
import { Community } from 'src/context/communities/domain/entities/community.entity';

/**
 * Política de autorización para comunidades
 * Define qué acciones puede realizar cada usuario sobre una comunidad
 */
export class CommunityPolicy implements Policy<Community> {
  /**
   * Cualquier usuario autenticado puede crear comunidades
   */
  canCreate(_user: AuthenticatedUser): boolean {
    return true;
  }

  /**
   * Las comunidades activas son visibles para todos
   * Las inactivas solo para el owner
   */
  canRead(user: AuthenticatedUser, community: Community): boolean {
    if (community.getIsActive()) {
      return true;
    }
    return community.getOwnerId() === user.userId;
  }

  /**
   * Solo el owner puede actualizar la comunidad
   * Nota: Los admins pueden actualizar a través del servicio,
   * pero la política base solo permite al owner
   */
  canUpdate(user: AuthenticatedUser, community: Community): boolean {
    return community.getOwnerId() === user.userId;
  }

  /**
   * Solo el owner puede eliminar la comunidad
   */
  canDelete(user: AuthenticatedUser, community: Community): boolean {
    return community.getOwnerId() === user.userId;
  }
}
