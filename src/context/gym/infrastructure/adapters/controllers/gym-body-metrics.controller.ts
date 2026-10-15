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
  GYM_BODY_METRICS_USECASE,
  GymBodyMetricsUseCase,
} from '../../../domain/ports/in/gym-body-metrics.usecase';
import { resolveWorkoutRange } from '../../../domain/workout-date';
import { CreateBodyMetricDto } from '../../../application/dtos/create-body-metric.dto';
import { UpdateBodyMetricDto } from '../../../application/dtos/update-body-metric.dto';
import { BodyMetricListQueryDto } from '../dtos/body-metric-list-query.dto';
import { BodyMetricTrendQueryDto } from '../dtos/body-metric-trend-query.dto';

@Controller('gym/body-metrics')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@RequireModule(GYM_MODULE_KEY)
export class GymBodyMetricsController {
  constructor(
    @Inject(GYM_BODY_METRICS_USECASE)
    private readonly gymBodyMetricsUseCase: GymBodyMetricsUseCase,
  ) {}

  /** Creates the entry of that date or replaces it when it already exists. */
  @Post()
  async upsert(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateBodyMetricDto,
  ) {
    const metric = await this.gymBodyMetricsUseCase.upsert(user.userId, dto);
    return metric.toPrimitives();
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query() query: BodyMetricListQueryDto,
  ) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const range = resolveWorkoutRange({
      preset: query.preset,
      from: query.from,
      to: query.to,
    });

    const results = await this.gymBodyMetricsUseCase.list({
      user_id: user.userId,
      take,
      cursor: query.cursor,
      range: range ?? undefined,
    });

    const nextCursor =
      results.length === take ? results[results.length - 1].getId() : null;

    return {
      data: results.map((metric) => metric.toPrimitives()),
      nextCursor,
    };
  }

  /** Most recent entry (useful for the dashboard). */
  @Get('latest')
  async latest(@CurrentUser() user: { userId: string }) {
    const metric = await this.gymBodyMetricsUseCase.latest(user.userId);
    return metric?.toPrimitives() ?? null;
  }

  /** Points of one metric over time. */
  @Get('trend')
  async trend(
    @CurrentUser() user: { userId: string },
    @Query() query: BodyMetricTrendQueryDto,
  ) {
    return this.gymBodyMetricsUseCase.trend(user.userId, {
      metric: query.metric,
      preset: query.preset,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const metric = await this.gymBodyMetricsUseCase.getById(user.userId, id);
    return metric.toPrimitives();
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateBodyMetricDto,
  ) {
    const metric = await this.gymBodyMetricsUseCase.update(
      user.userId,
      id,
      dto,
    );
    return metric.toPrimitives();
  }

  @Delete(':id')
  async softDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const metric = await this.gymBodyMetricsUseCase.softDelete(user.userId, id);
    return metric.toPrimitives();
  }

  @Put(':id/restore')
  async restore(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const metric = await this.gymBodyMetricsUseCase.restore(user.userId, id);
    return metric.toPrimitives();
  }

  @Delete(':id/hard')
  async hardDelete(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    await this.gymBodyMetricsUseCase.hardDelete(user.userId, id);
    return { success: true };
  }
}
