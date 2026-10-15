import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  ModuleEnabledGuard,
  RequireModule,
} from 'src/context/modules/infrastructure/adapters/guards/module-enabled.guard';
import { GYM_MODULE_KEY } from '../../../domain/constants';
import {
  GYM_REPORTS_USECASE,
  GymReportsUseCase,
} from '../../../domain/ports/in/gym-reports.usecase';
import { GymSummaryQueryDto } from '../dtos/gym-summary-query.dto';
import { GymVolumeQueryDto } from '../dtos/gym-volume-query.dto';
import { GymLoadQueryDto } from '../dtos/gym-load-query.dto';
import { GymRecordsQueryDto } from '../dtos/gym-records-query.dto';
import { GymCalendarQueryDto } from '../dtos/gym-calendar-query.dto';

@Controller('gym')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@RequireModule(GYM_MODULE_KEY)
export class GymReportsController {
  constructor(
    @Inject(GYM_REPORTS_USECASE)
    private readonly gymReportsUseCase: GymReportsUseCase,
  ) {}

  /** Volume, adherence and workload of the range (defaults to the last 30 days). */
  @Get('summary')
  async summary(
    @CurrentUser() user: { userId: string },
    @Query() query: GymSummaryQueryDto,
  ) {
    return this.gymReportsUseCase.summary(user.userId, {
      preset: query.preset,
      from: query.from,
      to: query.to,
    });
  }

  /** Volume per bucket (day/week/month). */
  @Get('analytics/volume')
  async volume(
    @CurrentUser() user: { userId: string },
    @Query() query: GymVolumeQueryDto,
  ) {
    return this.gymReportsUseCase.volumeSeries(
      user.userId,
      { preset: query.preset, from: query.from, to: query.to },
      query.period ?? 'day',
    );
  }

  /** Volume (and sets/reps) per muscle group — spots imbalances. */
  @Get('analytics/muscle-groups')
  async muscleGroups(
    @CurrentUser() user: { userId: string },
    @Query() query: GymSummaryQueryDto,
  ) {
    return this.gymReportsUseCase.muscleGroups(user.userId, {
      preset: query.preset,
      from: query.from,
      to: query.to,
    });
  }

  /** Internal load: sRPE per bucket plus the current acute:chronic ratio. */
  @Get('analytics/load')
  async load(
    @CurrentUser() user: { userId: string },
    @Query() query: GymLoadQueryDto,
  ) {
    return this.gymReportsUseCase.load(
      user.userId,
      { preset: query.preset, from: query.from, to: query.to },
      query.period ?? 'week',
    );
  }

  /** Session-by-session progress of one exercise (% change over the range). */
  @Get('analytics/exercises/:exercise_id/progress')
  async exerciseProgress(
    @CurrentUser() user: { userId: string },
    @Param('exercise_id') exercise_id: string,
    @Query() query: GymSummaryQueryDto,
  ) {
    return this.gymReportsUseCase.exerciseProgress(user.userId, exercise_id, {
      preset: query.preset,
      from: query.from,
      to: query.to,
    });
  }

  /** Lifetime personal records per exercise. */
  @Get('records')
  async records(
    @CurrentUser() user: { userId: string },
    @Query() query: GymRecordsQueryDto,
  ) {
    const data = await this.gymReportsUseCase.records(user.userId, {
      muscle_group: query.muscle_group,
      limit: query.limit,
    });

    return { data };
  }

  /** Month view: planned days (routine) vs completed sessions. */
  @Get('calendar')
  async calendar(
    @CurrentUser() user: { userId: string },
    @Query() query: GymCalendarQueryDto,
  ) {
    const now = new Date();

    return this.gymReportsUseCase.calendar(user.userId, {
      year: query.year ?? now.getUTCFullYear(),
      month: query.month ?? now.getUTCMonth() + 1,
      routine_id: query.routine_id,
    });
  }
}
