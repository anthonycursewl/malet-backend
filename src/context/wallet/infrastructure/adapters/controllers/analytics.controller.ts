import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { WalletAnalyticsService } from '../../../application/analytics.service';
import { AnalyticsQueryDto } from '../dtos/analytics.dto';
import { ANALYTICS_DEFAULT_RANGE_DAYS } from '../../../domain/constants';
import { TransactionType, SortField, SortOrder } from '../../../domain/constants';

@Controller('wallet/analytics')
@UseGuards(JwtAuthGuard)
export class WalletAnalyticsController {
  constructor(private readonly analyticsService: WalletAnalyticsService) {}

  private parseOptions(query: AnalyticsQueryDto) {
    return {
      sort_by: query.sort_by as SortField | undefined,
      order: query.order as SortOrder | undefined,
      limit: query.limit,
    };
  }

  private parsePeriodicFilters(query: AnalyticsQueryDto) {
    return {
      account_id: query.account_id,
      type: query.type as TransactionType | undefined,
      year: query.year,
      month: query.month,
    };
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSummary(user.userId, {
      account_id: query.account_id,
      type: query.type as TransactionType | undefined,
      from: query.from,
      to: query.to,
    });
  }

  @Get('daily')
  async getDaily(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getDaily(
      user.userId,
      this.parsePeriodicFilters(query),
      this.parseOptions(query),
    );
  }

  @Get('weekly')
  async getWeekly(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getWeekly(
      user.userId,
      this.parsePeriodicFilters(query),
      this.parseOptions(query),
    );
  }

  @Get('monthly')
  async getMonthly(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getMonthly(
      user.userId,
      this.parsePeriodicFilters(query),
      this.parseOptions(query),
    );
  }

  @Get('quarterly')
  async getQuarterly(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getQuarterly(
      user.userId,
      this.parsePeriodicFilters(query),
      this.parseOptions(query),
    );
  }

  @Get('yearly')
  async getYearly(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getYearly(
      user.userId,
      {
        account_id: query.account_id,
        type: query.type as TransactionType | undefined,
      },
      this.parseOptions(query),
    );
  }

  @Get('range')
  async getByRange(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    const now = new Date();
    const from =
      query.from ??
      new Date(now.getTime() - ANALYTICS_DEFAULT_RANGE_DAYS * 86400000)
        .toISOString()
        .slice(0, 10);
    const to = query.to ?? now.toISOString().slice(0, 10);

    return this.analyticsService.getByRange(
      user.userId,
      {
        from,
        to,
        account_id: query.account_id,
        type: query.type as TransactionType | undefined,
      },
      this.parseOptions(query),
    );
  }

  @Get('tags')
  async getByTags(
    @CurrentUser() user: { userId: string; email: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getByTags(
      user.userId,
      {
        from: query.from,
        to: query.to,
        account_id: query.account_id,
        type: query.type as TransactionType | undefined,
      },
      this.parseOptions(query),
    );
  }
}
