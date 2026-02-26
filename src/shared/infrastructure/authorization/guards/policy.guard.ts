import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  POLICY_KEY,
  PolicyMetadata,
} from '../decorators/check-policy.decorator';
import { PolicyHandlerService } from '../handlers/policy-handler.service';
import { PolicyAction } from 'src/shared/domain/policies/policy.interface';
import { ResourceResolver } from '../resolvers/resource-resolver.interface';
import { AccountResourceResolver } from '../resolvers/account.resolver';
import { UserResourceResolver } from '../resolvers/user.resolver';

/**
 * Guard que verifica las políticas de autorización declaradas con @CheckPolicy.
 *
 * Este guard:
 * 1. Lee los metadatos del decorador @CheckPolicy
 * 2. Resuelve el recurso usando el resolver apropiado
 * 3. Verifica la política usando PolicyHandlerService
 * 4. Adjunta el recurso resuelto al request para uso posterior
 *
 * @example
 * ```typescript
 * @Controller('accounts')
 * @UseGuards(JwtAuthGuard, PolicyGuard)
 * export class AccountsController {
 *     @Put(':id')
 *     @CanUpdate('account', 'id')
 *     async update(@ResolvedResource() account: Account) { ... }
 * }
 * ```
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly resolvers: Map<string, ResourceResolver<any>>;

  constructor(
    private reflector: Reflector,
    private policyHandler: PolicyHandlerService,
    @Optional() private accountResolver: AccountResourceResolver,
    @Optional() private userResolver: UserResourceResolver,
  ) {
    // Construir mapa de resolvers
    this.resolvers = new Map();
    if (this.accountResolver) {
      this.resolvers.set('account', this.accountResolver);
    }
    if (this.userResolver) {
      this.resolvers.set('user', this.userResolver);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyMetadata = this.reflector.get<PolicyMetadata>(
      POLICY_KEY,
      context.getHandler(),
    );

    if (!policyMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const { action, resourceType, resourceIdParam, options } = policyMetadata;

    // Para CREATE, no necesitamos resolver un recurso existente
    if (action === PolicyAction.CREATE) {
      const isAllowed = this.policyHandler.check(
        action,
        resourceType,
        user,
        null,
      );
      if (!isAllowed) {
        throw new ForbiddenException(
          'No tienes permisos para crear este recurso',
        );
      }
      return true;
    }

    // Para otras acciones, necesitamos el ID del recurso
    const resourceId = request.params[resourceIdParam!];

    if (!resourceId) {
      throw new ForbiddenException(
        `Parámetro de recurso '${resourceIdParam}' no encontrado en la ruta`,
      );
    }

    // Obtener el resolver apropiado
    const resolver = this.resolvers.get(resourceType);

    if (!resolver) {
      throw new ForbiddenException(
        `No hay resolver configurado para el tipo de recurso: ${resourceType}`,
      );
    }

    const resource = await resolver.resolve(resourceId, options);


    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    // Verificar la política
    const isAllowed = this.policyHandler.check(
      action,
      resourceType,
      user,
      resource,
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }

    // Adjuntar el recurso al request para evitar doble fetch
    // Los handlers pueden usar @ResolvedResource() para obtenerlo
    request.resolvedResource = resource;

    return true;
  }
}
