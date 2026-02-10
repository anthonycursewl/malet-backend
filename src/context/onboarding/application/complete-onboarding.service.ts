import { Injectable, Inject } from '@nestjs/common';
import {
  CompleteOnboardingUseCase,
  UpdateOnboardingParams,
} from '../domain/ports/in/complete-onboarding.usecase';
import {
  USER_ONBOARDING_REPOSITORY_PORT,
  UserOnboardingRepository,
} from '../domain/ports/out/user-onboarding.repository';
import { UserOnboarding } from '../domain/entities/user-onboarding.entity';

@Injectable()
export class CompleteOnboardingService implements CompleteOnboardingUseCase {
  constructor(
    @Inject(USER_ONBOARDING_REPOSITORY_PORT)
    private readonly onboardingRepository: UserOnboardingRepository,
  ) {}

  async updateProgress(
    userId: string,
    params: UpdateOnboardingParams,
  ): Promise<UserOnboarding> {
    // Asegurar que existe el registro
    await this.onboardingRepository.getOrCreate(userId);

    return this.onboardingRepository.update(userId, params);
  }

  async complete(userId: string): Promise<UserOnboarding> {
    // Asegurar que existe el registro
    await this.onboardingRepository.getOrCreate(userId);

    return this.onboardingRepository.update(userId, {
      completed: true,
      completedAt: new Date(),
    });
  }

  async skip(userId: string): Promise<UserOnboarding> {
    // Asegurar que existe el registro
    await this.onboardingRepository.getOrCreate(userId);

    return this.onboardingRepository.update(userId, {
      skipped: true,
      completedAt: new Date(),
    });
  }
}
