import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

// Use Cases - Tokens
import { GET_INTEREST_CATEGORIES_USECASE } from './domain/ports/in/get-interest-categories.usecase';
import { SAVE_USER_INTERESTS_USECASE } from './domain/ports/in/save-user-interests.usecase';
import { GET_ONBOARDING_STATUS_USECASE } from './domain/ports/in/get-onboarding-status.usecase';
import { COMPLETE_ONBOARDING_USECASE } from './domain/ports/in/complete-onboarding.usecase';

// Services
import { GetInterestCategoriesService } from './application/get-interest-categories.service';
import { SaveUserInterestsService } from './application/save-user-interests.service';
import { GetOnboardingStatusService } from './application/get-onboarding-status.service';
import { CompleteOnboardingService } from './application/complete-onboarding.service';

// Repositories - Tokens
import { INTEREST_CATEGORY_REPOSITORY_PORT } from './domain/ports/out/interest-category.repository';
import { USER_INTEREST_REPOSITORY_PORT } from './domain/ports/out/user-interest.repository';
import { USER_ONBOARDING_REPOSITORY_PORT } from './domain/ports/out/user-onboarding.repository';

// Repository Adapters
import { InterestCategoryRepositoryAdapter } from './infrastructure/persistence/interest-category.repository.adapter';
import { UserInterestRepositoryAdapter } from './infrastructure/persistence/user-interest.repository.adapter';
import { UserOnboardingRepositoryAdapter } from './infrastructure/persistence/user-onboarding.repository.adapter';

// Controllers
import { OnboardingController } from './infrastructure/adapters/controllers/onboarding.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    // ============ USE CASES ============
    {
      provide: GET_INTEREST_CATEGORIES_USECASE,
      useClass: GetInterestCategoriesService,
    },
    {
      provide: SAVE_USER_INTERESTS_USECASE,
      useClass: SaveUserInterestsService,
    },
    {
      provide: GET_ONBOARDING_STATUS_USECASE,
      useClass: GetOnboardingStatusService,
    },
    {
      provide: COMPLETE_ONBOARDING_USECASE,
      useClass: CompleteOnboardingService,
    },

    // ============ REPOSITORIES ============
    {
      provide: INTEREST_CATEGORY_REPOSITORY_PORT,
      useClass: InterestCategoryRepositoryAdapter,
    },
    {
      provide: USER_INTEREST_REPOSITORY_PORT,
      useClass: UserInterestRepositoryAdapter,
    },
    {
      provide: USER_ONBOARDING_REPOSITORY_PORT,
      useClass: UserOnboardingRepositoryAdapter,
    },
  ],
  controllers: [OnboardingController],
  exports: [
    INTEREST_CATEGORY_REPOSITORY_PORT,
    USER_INTEREST_REPOSITORY_PORT,
    USER_ONBOARDING_REPOSITORY_PORT,
  ],
})
export class OnboardingModule {}
