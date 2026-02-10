import { Injectable } from '@nestjs/common';
import {
  PolicyAction,
  AuthenticatedUser,
  Policy,
  AccountPolicy,
  UserPolicy,
  TransactionPolicy,
} from 'src/shared/domain/policies';
import { CommunityPolicy } from 'src/shared/domain/policies/community.policy';

/**
 * Servicio central que gestiona y ejecuta las políticas de autorización.
 *
 * Registra todas las políticas disponibles y proporciona un método
 * unificado para verificar permisos sobre cualquier tipo de recurso.
 */
@Injectable()
export class PolicyHandlerService {
  private policies: Map<string, Policy<any>> = new Map();

  constructor() {
    // Registrar todas las políticas disponibles
    this.policies.set('account', new AccountPolicy());
    this.policies.set('user', new UserPolicy());
    this.policies.set('transaction', new TransactionPolicy());
    this.policies.set('community', new CommunityPolicy());
  }

  /**
   * Registra una nueva política (útil para extensión)
   */
  registerPolicy<T>(resourceType: string, policy: Policy<T>): void {
    this.policies.set(resourceType, policy);
  }

  /**
   * Verifica si un usuario tiene permiso para realizar una acción sobre un recurso.
   *
   * @param action - La acción a verificar (CREATE, READ, UPDATE, DELETE, MANAGE)
   * @param resourceType - El tipo de recurso ('account', 'user', 'transaction')
   * @param user - El usuario autenticado
   * @param resource - El recurso sobre el que se verifica el permiso
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  check<T>(
    action: PolicyAction,
    resourceType: string,
    user: AuthenticatedUser,
    resource: T | null,
  ): boolean {
    const policy = this.policies.get(resourceType);

    if (!policy) {
      console.warn(
        `[PolicyHandler] No policy found for resource type: ${resourceType}`,
      );
      return false; // Denegar por defecto si no hay política
    }

    switch (action) {
      case PolicyAction.CREATE:
        return policy.canCreate(user, resource ?? undefined);

      case PolicyAction.READ:
        if (!resource) return false;
        return policy.canRead(user, resource);

      case PolicyAction.UPDATE:
        if (!resource) return false;
        return policy.canUpdate(user, resource);

      case PolicyAction.DELETE:
        if (!resource) return false;
        return policy.canDelete(user, resource);

      case PolicyAction.MANAGE:
        // MANAGE = todos los permisos
        if (!resource) return false;
        return (
          policy.canCreate(user, resource) &&
          policy.canRead(user, resource) &&
          policy.canUpdate(user, resource) &&
          policy.canDelete(user, resource)
        );

      default:
        console.warn(`[PolicyHandler] Unknown action: ${action}`);
        return false;
    }
  }

  /**
   * Verifica si existe una política para el tipo de recurso dado
   */
  hasPolicy(resourceType: string): boolean {
    return this.policies.has(resourceType);
  }

  /**
   * Obtiene una lista de todos los tipos de recursos con políticas registradas
   */
  getRegisteredResourceTypes(): string[] {
    return Array.from(this.policies.keys());
  }
}
