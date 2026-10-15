import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  MODULES_USECASE,
  ModulesUseCase,
} from '../../../domain/ports/in/modules.usecase';
import { ModuleKey } from '../../../domain/constants';
import { UpdateModuleDto } from '../dtos/update-module.dto';

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(
    @Inject(MODULES_USECASE)
    private readonly modulesUseCase: ModulesUseCase,
  ) {}

  /** Optional modules with their enabled state; the app hides the disabled ones. */
  @Get()
  async list(@CurrentUser() user: { userId: string }) {
    return this.modulesUseCase.list(user.userId);
  }

  @Put(':key')
  async setEnabled(
    @CurrentUser() user: { userId: string },
    @Param('key') key: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.modulesUseCase.setEnabled(
      user.userId,
      key as ModuleKey,
      dto.enabled,
    );
  }
}
