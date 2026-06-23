import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SOURCE_KEY } from '../decorators/source.decorator';

@Injectable()
export class SourceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedSources = this.reflector.getAllAndOverride<string[]>(
      SOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedSources || allowedSources.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const source = request.headers['x-client-source'];

    if (!source) {
      throw new ForbiddenException(
        `Missing X-Client-Source header. Allowed: ${allowedSources.join(', ')}`,
      );
    }

    if (!allowedSources.includes(source)) {
      throw new ForbiddenException(
        `Invalid source "${source}". Allowed: ${allowedSources.join(', ')}`,
      );
    }

    return true;
  }
}
