import { Module } from '@nestjs/common';
import { UpdaterService } from './application/updater.service';
import { UpdaterController } from './infrastructure/adapters/controllers/updater.controller';

@Module({
  controllers: [UpdaterController],
  providers: [UpdaterService],
})
export class UpdaterModule {}
