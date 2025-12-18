/**
 * Interface para resolvedores de recursos.
 * 
 * Los resolvers son responsables de obtener el recurso
 * a partir de su ID para que el PolicyGuard pueda
 * verificar las políticas de autorización.
 */
export interface ResourceResolver<T> {
    /**
     * Resuelve un recurso por su ID
     * @param resourceId - El ID del recurso a resolver
     * @returns El recurso o null si no existe
     */
    resolve(resourceId: string): Promise<T | null>;
}

/**
 * Token de inyección para el registro de resolvers
 */
export const RESOURCE_RESOLVERS = 'RESOURCE_RESOLVERS';
