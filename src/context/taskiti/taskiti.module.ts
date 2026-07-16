import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TaskitiJwtStrategy } from './infrastructure/services/taskiti-jwt.strategy';
import { TaskitiAuthService } from './infrastructure/services/taskiti-auth.service';
import { TaskitiLoginService } from './application/taskiti-login.service';
import { TaskitiRegisterService } from './application/taskiti-register.service';
import { TaskitiRefreshService } from './application/taskiti-refresh.service';
import { TaskitiTasksService } from './application/taskiti-tasks.service';
import { TaskitiAnalyticsService } from './application/taskiti-analytics.service';
import { TaskitiAuthController } from './infrastructure/adapters/controllers/taskiti-auth.controller';
import { TaskitiTasksController } from './infrastructure/adapters/controllers/taskiti-tasks.controller';
import { TaskitiAnalyticsController } from './infrastructure/adapters/controllers/taskiti-analytics.controller';
import { TaskitiDebugController } from './infrastructure/adapters/controllers/taskiti-debug.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TaskitiAuthController, TaskitiTasksController, TaskitiAnalyticsController, TaskitiDebugController],
  providers: [
    TaskitiJwtStrategy,
    TaskitiAuthService,
    TaskitiLoginService,
    TaskitiRegisterService,
    TaskitiRefreshService,
    TaskitiTasksService,
    TaskitiAnalyticsService,
  ],
})
export class TaskitiModule {}
