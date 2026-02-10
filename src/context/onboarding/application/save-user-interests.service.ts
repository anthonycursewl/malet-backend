import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  SaveUserInterestsUseCase,
  SaveUserInterestsParams,
  SaveUserInterestsResult,
} from '../domain/ports/in/save-user-interests.usecase';
import {
  USER_INTEREST_REPOSITORY_PORT,
  UserInterestRepository,
} from '../domain/ports/out/user-interest.repository';
import {
  USER_ONBOARDING_REPOSITORY_PORT,
  UserOnboardingRepository,
} from '../domain/ports/out/user-onboarding.repository';
import {
  INTEREST_CATEGORY_REPOSITORY_PORT,
  InterestCategoryRepository,
} from '../domain/ports/out/interest-category.repository';
import { UserInterest } from '../domain/entities/user-interest.entity';

@Injectable()
export class SaveUserInterestsService implements SaveUserInterestsUseCase {
  private static readonly MIN_INTERESTS = 3;
  private static readonly MAX_INTERESTS = 10;

  constructor(
    @Inject(USER_INTEREST_REPOSITORY_PORT)
    private readonly interestRepository: UserInterestRepository,
    @Inject(USER_ONBOARDING_REPOSITORY_PORT)
    private readonly onboardingRepository: UserOnboardingRepository,
    @Inject(INTEREST_CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: InterestCategoryRepository,
  ) {}

  async execute(
    userId: string,
    params: SaveUserInterestsParams,
  ): Promise<SaveUserInterestsResult> {
    const { categoryIds } = params;

    // Validar cantidad de intereses
    if (categoryIds.length < SaveUserInterestsService.MIN_INTERESTS) {
      throw new BadRequestException(
        `Debes seleccionar al menos ${SaveUserInterestsService.MIN_INTERESTS} intereses`,
      );
    }

    if (categoryIds.length > SaveUserInterestsService.MAX_INTERESTS) {
      throw new BadRequestException(
        `No puedes seleccionar más de ${SaveUserInterestsService.MAX_INTERESTS} intereses`,
      );
    }

    // Validar que las categorías existen
    const categories = await this.categoryRepository.findByIds(categoryIds);
    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Una o más categorías no existen');
    }

    // Eliminar intereses anteriores del usuario
    await this.interestRepository.deleteByUserId(userId);

    // Crear nuevos intereses
    const interests = categoryIds.map((categoryId) =>
      UserInterest.createFromOnboarding(userId, categoryId),
    );

    // Guardar intereses
    const savedInterests = await this.interestRepository.saveMany(interests);

    // Marcar paso de intereses como completado
    await this.onboardingRepository.getOrCreate(userId);
    await this.onboardingRepository.update(userId, { stepInterests: true });

    return {
      interests: savedInterests,
      count: savedInterests.length,
    };
  }
}
