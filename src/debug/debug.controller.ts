import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('debug')
export class DebugController {
  constructor(private configService: ConfigService) {}

  @Get('env')
  getEnv() {
    return {
      JWT_SECRET: this.configService.get('JWT_SECRET'),
      NODE_ENV: this.configService.get('NODE_ENV'),
      // Add any other environment variables you want to check
    };
  }
}
