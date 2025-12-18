import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador de parámetro que obtiene el recurso ya resuelto y verificado.
 * 
 * El PolicyGuard resuelve el recurso y lo adjunta al request después
 * de verificar que el usuario tiene permisos. Este decorador lo extrae.
 * 
 * @example
 * ```typescript
 * @Put(':account_id')
 * @CanUpdate('account', 'account_id')
 * async updateAccount(
 *     @ResolvedResource() account: Account,  // Ya verificado!
 *     @Body() dto: UpdateDto
 * ) {
 *     // account ya pasó la verificación de ownership
 * }
 * ```
 */
export const ResolvedResource = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.resolvedResource;
    },
);
