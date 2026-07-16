import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.configService.get<string>('UPDATER_API_KEY');

    if (!apiKey) {
      throw new UnauthorizedException('Updater API key not configured on server');
    }

    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers['x-api-key'];

    if (!headerKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    if (headerKey !== apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
