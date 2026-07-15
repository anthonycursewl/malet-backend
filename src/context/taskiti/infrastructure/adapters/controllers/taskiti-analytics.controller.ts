import {
  Controller,
  Get,
  Post,
  Req,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SourceGuard } from '../../../../../auth/guards/source.guard';
import { Source } from '../../../../../auth/decorators/source.decorator';
import { TaskitiAnalyticsService } from '../../../application/taskiti-analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('taskiti-jwt'), SourceGuard)
@Source('taskiti')
export class TaskitiAnalyticsController {
  constructor(
    private readonly analyticsService: TaskitiAnalyticsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAnalytics(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getAnalytics(
      req.user.userId,
      from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      to || new Date().toISOString().slice(0, 10),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any) {
    return this.analyticsService.refreshNow();
  }
}
