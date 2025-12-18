import { Policy, AuthenticatedUser } from './policy.interface';
import { User } from 'src/context/users/domain/entities/user.entity';

/**
 * Política de autorización para recursos de tipo User.
 * Define las reglas de negocio para determinar quién puede
 * realizar operaciones sobre los perfiles de usuario.
 */
export class UserPolicy implements Policy<User> {
    /**
     * El registro es público, CREATE no requiere verificación de ownership
     * Este método no debería usarse normalmente ya que registro es público
     */
    canCreate(user: AuthenticatedUser): boolean {
        return false;
    }

    /**
     * Cualquier usuario autenticado puede ver perfiles públicos.
     * Para datos sensibles, se verificaría el ownership.
     */
    canRead(user: AuthenticatedUser, targetUser: User): boolean {
        // Perfiles son públicos para usuarios autenticados
        return true;
    }

    /**
     * Solo puedes actualizar tu propio perfil
     */
    canUpdate(user: AuthenticatedUser, targetUser: User): boolean {
        return targetUser.getId() === user.userId;
    }

    /**
     * Solo puedes eliminar tu propia cuenta
     */
    canDelete(user: AuthenticatedUser, targetUser: User): boolean {
        return targetUser.getId() === user.userId;
    }
}
