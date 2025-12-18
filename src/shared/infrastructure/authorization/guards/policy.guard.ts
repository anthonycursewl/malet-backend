import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { POLICY_KEY, PolicyMetadata } from '../decorators/check-policy.decorator';
import { PolicyHandlerService } from '../handlers/policy-handler.service';
import { PolicyAction } from 'src/shared/domain/policies/policy.interface';
import { ResourceResolver } from '../resolvers/resource-resolver.interface';

/**
 * Mapa de resolvers por tipo de recurso.
 * Mapea el nombre del recurso al token de inyección del resolver.
 */
const RESOLVER_TOKENS: Record<string, string> = {
    'account': 'AccountResourceResolver',
    'user': 'UserResourceResolver',
};

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
    constructor(
        private reflector: Reflector,
        private policyHandler: PolicyHandlerService,
        private moduleRef: ModuleRef
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyMetadata = this.reflector.get<PolicyMetadata>(
            POLICY_KEY,
            context.getHandler()
        );

        if (!policyMetadata) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        const { action, resourceType, resourceIdParam } = policyMetadata;

        // Para CREATE, no necesitamos resolver un recurso existente
        if (action === PolicyAction.CREATE) {
            const isAllowed = this.policyHandler.check(action, resourceType, user, null);
            if (!isAllowed) {
                throw new ForbiddenException('No tienes permisos para crear este recurso');
            }
            return true;
        }

        // Para otras acciones, necesitamos el ID del recurso
        const resourceId = request.params[resourceIdParam!];

        if (!resourceId) {
            throw new ForbiddenException(
                `Parámetro de recurso '${resourceIdParam}' no encontrado en la ruta`
            );
        }

        // Obtener el resolver apropiado
        const resolverToken = RESOLVER_TOKENS[resourceType];
        if (!resolverToken) {
            throw new ForbiddenException(
                `No hay resolver configurado para el tipo de recurso: ${resourceType}`
            );
        }

        // Resolver el recurso
        let resolver: ResourceResolver<any>;
        try {
            resolver = this.moduleRef.get(resolverToken, { strict: false });
        } catch (error) {
            throw new ForbiddenException(
                `Error al obtener el resolver para: ${resourceType}`
            );
        }

        const resource = await resolver.resolve(resourceId);

        if (!resource) {
            throw new NotFoundException('Recurso no encontrado');
        }

        // Verificar la política
        const isAllowed = this.policyHandler.check(action, resourceType, user, resource);

        if (!isAllowed) {
            throw new ForbiddenException('No tienes permisos para realizar esta acción');
        }

        // Adjuntar el recurso al request para evitar doble fetch
        // Los handlers pueden usar @ResolvedResource() para obtenerlo
        request.resolvedResource = resource;

        return true;
    }
}
