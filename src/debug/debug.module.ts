import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DebugController } from './debug.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DebugController],
})
export class DebugModule {}
