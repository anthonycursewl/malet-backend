import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('debug')
export class DebugController {
  constructor(private configService: ConfigService) {}

  @Get('env')
  getEnv() {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 4100,
    };
  }
}
