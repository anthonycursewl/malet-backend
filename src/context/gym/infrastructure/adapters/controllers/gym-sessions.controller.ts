import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  ModuleEnabledGuard,
  RequireModule,
} from 'src/context/modules/infrastructure/adapters/guards/module-enabled.guard';
import {
  DEFAULT_LIST_TAKE,
  GYM_MODULE_KEY,
  GymSessionStatus,
} from '../../../domain/constants';
import {
  GYM_SESSIONS_USECASE,
  GymSessionsUseCase,
} from '../../../domain/ports/in/gym-sessions.usecase';
import { CreateSessionDto } from '../../../application/dtos/create-session.dto';
import { UpdateSessionDto } from '../../../application/dtos/update-session.dto';
import { SessionListQueryDto } from '../dtos/session-list-query.dto';

@Controller('gym/sessions')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@RequireModule(GYM_MODULE_KEY)
export class GymSessionsController {
  constructor(
    @Inject(GYM_SESSIONS_USECASE)
    private readonly gymSessionsUseCase: GymSessionsUseCase,
  ) {}

  /**
   * Logs a workout. When only `routine_day_id` is sent, the session is
   * prefilled from the routine day and starts as `in_progress`.
   */
  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSessionDto,
  ) {
    const session = await this.gymSessionsUseCase.create(user.userId, dto);
    return session.toPrimitives();
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: SessionListQueryDto,
  ) {
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.gymSessionsUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
      routine_id: query.routine_id,
      routine_day_id: query.routine_day_id,
      status: query.status as GymSessionStatus | undefined,
      preset: query.preset,
      from: query.from,
      to: query.to,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((session) => session.toPrimitives()),
      nextCursor,
    };
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const session = await this.gymSessionsUseCase.getById(user.userId, id);
    return session.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const session = await this.gymSessionsUseCase.update(user.userId, id, dto);
    return session.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const session = await this.gymSessionsUseCase.softDelete(user.userId, id);
    return session.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const session = await this.gymSessionsUseCase.restore(user.userId, id);
    return session.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.gymSessionsUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
