import { Injectable } from '@nestjs/common';
import {
  WalletAnalyticsUseCase,
  AnalyticsFilters,
  PeriodicFilters,
  DateRangeFilters,
  AnalyticsQueryOptions,
  AnalyticsSummary,
  DailyPoint,
  WeeklyPoint,
  MonthlyPoint,
  QuarterlyPoint,
  YearlyPoint,
  TagBreakdown,
} from '../domain/ports/in/analytics.usecase';
import { WalletAnalyticsRepository } from '../infrastructure/persistence/analytics.repository.adapter';

@Injectable()
export class WalletAnalyticsService implements WalletAnalyticsUseCase {
  constructor(
    private readonly analyticsRepository: WalletAnalyticsRepository,
  ) {}

  async getSummary(
    userId: string,
    filters?: DateRangeFilters,
  ): Promise<AnalyticsSummary> {
    return this.analyticsRepository.getSummary(userId, filters);
  }

  async getDaily(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<DailyPoint[]> {
    return this.analyticsRepository.getDaily(userId, filters, options);
  }

  async getWeekly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<WeeklyPoint[]> {
    return this.analyticsRepository.getWeekly(userId, filters, options);
  }

  async getMonthly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<MonthlyPoint[]> {
    return this.analyticsRepository.getMonthly(userId, filters, options);
  }

  async getQuarterly(
    userId: string,
    filters?: PeriodicFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<QuarterlyPoint[]> {
    return this.analyticsRepository.getQuarterly(userId, filters, options);
  }

  async getYearly(
    userId: string,
    filters?: AnalyticsFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<YearlyPoint[]> {
    return this.analyticsRepository.getYearly(userId, filters, options);
  }

  async getByRange(
    userId: string,
    filters: DateRangeFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<DailyPoint[]> {
    return this.analyticsRepository.getByRange(userId, filters, options);
  }

  async getByTags(
    userId: string,
    filters?: DateRangeFilters,
    options?: AnalyticsQueryOptions,
  ): Promise<TagBreakdown[]> {
    return this.analyticsRepository.getByTags(userId, filters, options);
  }
}
