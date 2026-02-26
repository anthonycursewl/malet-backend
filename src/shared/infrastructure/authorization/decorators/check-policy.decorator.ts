import { SetMetadata } from '@nestjs/common';
import { PolicyAction } from 'src/shared/domain/policies/policy.interface';

export const POLICY_KEY = 'policy';

/**
 * Metadata que define qué política aplicar en un endpoint
 */
export interface PolicyMetadata {
  /** La acción a verificar (READ, UPDATE, DELETE, etc.) */
  action: PolicyAction;
  /** El tipo de recurso (account, user, transaction) */
  resourceType: string;
  /** Nombre del parámetro de ruta que contiene el ID del recurso */
  resourceIdParam?: string;
  /** Opciones adicionales para el resolver (ej: includeDeleted) */
  options?: any;
}


/**
 * Decorador principal para verificar políticas de autorización.
 *
 * @param action - La acción a verificar (READ, UPDATE, DELETE, CREATE)
 * @param resourceType - El tipo de recurso ('account', 'user', 'transaction')
 * @param resourceIdParam - Nombre del parámetro de ruta con el ID (default: 'id')
 *
 * @example
 * ```typescript
 * @CheckPolicy(PolicyAction.UPDATE, 'account', 'account_id')
 * async updateAccount(@Param('account_id') id: string) { ... }
 * ```
 */
export const CheckPolicy = (
  action: PolicyAction,
  resourceType: string,
  resourceIdParam: string = 'id',
  options?: any,
) =>
  SetMetadata(POLICY_KEY, {
    action,
    resourceType,
    resourceIdParam,
    options,
  } as PolicyMetadata);


// ============================================
// Decoradores de conveniencia para cada acción
// ============================================

/**
 * Verifica que el usuario puede LEER el recurso
 * @example @CanRead('account', 'account_id')
 */
export const CanRead = (resource: string, idParam: string = 'id', options?: any) =>
  CheckPolicy(PolicyAction.READ, resource, idParam, options);

/**
 * Verifica que el usuario puede ACTUALIZAR el recurso
 * @example @CanUpdate('account', 'account_id')
 */
export const CanUpdate = (
  resource: string,
  idParam: string = 'id',
  options?: any,
) => CheckPolicy(PolicyAction.UPDATE, resource, idParam, options);


/**
 * Verifica que el usuario puede ELIMINAR el recurso
 * @example @CanDelete('account', 'account_id')
 */
export const CanDelete = (resource: string, idParam: string = 'id') =>
  CheckPolicy(PolicyAction.DELETE, resource, idParam);

/**
 * Verifica que el usuario puede CREAR recursos de este tipo
 * @example @CanCreate('account')
 */
export const CanCreate = (resource: string) =>
  CheckPolicy(PolicyAction.CREATE, resource);

/**
 * Verifica que el usuario tiene TODOS los permisos sobre el recurso
 * @example @CanManage('account', 'account_id')
 */
export const CanManage = (resource: string, idParam: string = 'id') =>
  CheckPolicy(PolicyAction.MANAGE, resource, idParam);
