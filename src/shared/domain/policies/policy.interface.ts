/**
 * Acciones posibles sobre recursos
 */
export enum PolicyAction {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    MANAGE = 'manage'  // Todos los permisos
}

/**
 * Usuario autenticado (del JWT)
 */
export interface AuthenticatedUser {
    userId: string;
    email: string;
}

/**
 * Interface que todas las políticas deben implementar.
 * Las políticas definen las reglas de autorización para cada tipo de recurso.
 * 
 * @template T - El tipo de recurso que la política protege
 */
export interface Policy<T> {
    /**
     * Verifica si el usuario puede crear un nuevo recurso
     */
    canCreate(user: AuthenticatedUser, resource?: T): boolean;

    /**
     * Verifica si el usuario puede leer el recurso
     */
    canRead(user: AuthenticatedUser, resource: T): boolean;

    /**
     * Verifica si el usuario puede actualizar el recurso
     */
    canUpdate(user: AuthenticatedUser, resource: T): boolean;

    /**
     * Verifica si el usuario puede eliminar el recurso
     */
    canDelete(user: AuthenticatedUser, resource: T): boolean;
}

/**
 * Tipo genérico para cualquier función de verificación de política
 */
export type PolicyCheck<T> = (user: AuthenticatedUser, resource: T) => boolean;
