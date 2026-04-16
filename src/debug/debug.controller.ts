import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('debug')
export class DebugController {
  constructor(private configService: ConfigService) {}

  @Get('env')
  getEnv() {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 4100,
    };
  }
}
