import { Injectable, Inject } from '@nestjs/common';
import {
  GetOnboardingStatusUseCase,
  OnboardingStatusResult,
} from '../domain/ports/in/get-onboarding-status.usecase';
import {
  USER_ONBOARDING_REPOSITORY_PORT,
  UserOnboardingRepository,
} from '../domain/ports/out/user-onboarding.repository';

@Injectable()
export class GetOnboardingStatusService implements GetOnboardingStatusUseCase {
  constructor(
    @Inject(USER_ONBOARDING_REPOSITORY_PORT)
    private readonly onboardingRepository: UserOnboardingRepository,
  ) {}

  async execute(userId: string): Promise<OnboardingStatusResult> {
    // Obtener o crear el registro de onboarding
    const onboarding = await this.onboardingRepository.getOrCreate(userId);

    return {
      onboarding,
      needsOnboarding: onboarding.needsOnboarding(),
      progress: onboarding.getProgress(),
      nextStep: onboarding.getNextStep(),
    };
  }
}
