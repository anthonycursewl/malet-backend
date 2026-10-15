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
import { DEFAULT_LIST_TAKE, GYM_MODULE_KEY } from '../../../domain/constants';
import {
  GYM_ROUTINES_USECASE,
  GymRoutinesUseCase,
} from '../../../domain/ports/in/gym-routines.usecase';
import { CreateRoutineDto } from '../../../application/dtos/create-routine.dto';
import { UpdateRoutineDto } from '../../../application/dtos/update-routine.dto';
import { SetRoutineDayDto } from '../../../application/dtos/set-routine-day.dto';
import { RoutineListQueryDto } from '../dtos/routine-list-query.dto';

@Controller('gym/routines')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@RequireModule(GYM_MODULE_KEY)
export class GymRoutinesController {
  constructor(
    @Inject(GYM_ROUTINES_USECASE)
    private readonly gymRoutinesUseCase: GymRoutinesUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: RoutineListQueryDto,
  ) {
    const take = query.take ?? DEFAULT_LIST_TAKE;

    const results = await this.gymRoutinesUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((routine) => routine.toPrimitives()),
      nextCursor,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRoutineDto,
  ) {
    const routine = await this.gymRoutinesUseCase.create(user.userId, dto);
    return routine.toPrimitives();
  }

  /** The active routine of the user, or `null`. */
  @Get('active')
  async active(@CurrentUser() user: { userId: string }) {
    const routine = await this.gymRoutinesUseCase.getActive(user.userId);
    return routine?.toPrimitives() ?? null;
  }

  /** The Monday-to-Sunday grid of the routine (always 7 slots). */
  @Get(':id/week')
  async week(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.gymRoutinesUseCase.getWeek(user.userId, id);
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const routine = await this.gymRoutinesUseCase.getById(user.userId, id);
    return routine.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    const routine = await this.gymRoutinesUseCase.update(user.userId, id, dto);
    return routine.toPrimitives();
  }

  /** Replaces the whole day: title, rest flag, notes and exercises. */
  @Put(':id/days/:day_of_week')
  async setDay(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('day_of_week') day_of_week: string,
    @Body() dto: SetRoutineDayDto,
  ) {
    const routine = await this.gymRoutinesUseCase.setDay(
      user.userId,
      id,
      Number(day_of_week),
      dto,
    );
    return routine.toPrimitives();
  }

  @Delete(':id/days/:day_of_week')
  async deleteDay(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('day_of_week') day_of_week: string,
  ) {
    const routine = await this.gymRoutinesUseCase.deleteDay(
      user.userId,
      id,
      Number(day_of_week),
    );
    return routine.toPrimitives();
  }

  @Put(':id/activate')
  async activate(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const routine = await this.gymRoutinesUseCase.activate(user.userId, id);
    return routine.toPrimitives();
  }

  @Put(':id/deactivate')
  async deactivate(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const routine = await this.gymRoutinesUseCase.deactivate(user.userId, id);
    return routine.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const routine = await this.gymRoutinesUseCase.softDelete(user.userId, id);
    return routine.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const routine = await this.gymRoutinesUseCase.restore(user.userId, id);
    return routine.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.gymRoutinesUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
