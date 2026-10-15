import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MODULES_USECASE,
  ModulesUseCase,
} from '../../../domain/ports/in/modules.usecase';
import { ModuleKey } from '../../../domain/constants';

export const REQUIRED_MODULE_KEY = 'required_module_key';

/**
 * Marks a controller/handler as belonging to an opt-in module: the request is
 * rejected with `403` unless the authenticated user enabled that module.
 */
export const RequireModule = (key: ModuleKey) =>
  SetMetadata(REQUIRED_MODULE_KEY, key);

@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    @Inject(MODULES_USECASE)
    private readonly modulesUseCase: ModulesUseCase,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleKey | undefined>(
      REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user_id = request.user?.userId;
    if (!user_id) {
      throw new ForbiddenException('Not authenticated');
    }

    await this.modulesUseCase.assertEnabled(user_id, required);
    return true;
  }
}
