import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { ModulesController } from './infrastructure/adapters/controllers/modules.controller';
import { USER_MODULE_REPOSITORY_PORT } from './domain/ports/out/user-module.repository';
import { MODULES_USECASE } from './domain/ports/in/modules.usecase';
import { UserModuleRepositoryAdapter } from './infrastructure/persistence/user-module.repository.adapter';
import { ModulesService } from './application/modules.service';
import { ModuleEnabledGuard } from './infrastructure/adapters/guards/module-enabled.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ModulesController],
  providers: [
    {
      provide: USER_MODULE_REPOSITORY_PORT,
      useClass: UserModuleRepositoryAdapter,
    },
    {
      provide: MODULES_USECASE,
      useClass: ModulesService,
    },
    ModuleEnabledGuard,
  ],
  exports: [MODULES_USECASE, ModuleEnabledGuard],
})
export class ModulesModule {}
