import { Injectable, Inject } from '@nestjs/common';
import { GetInterestCategoriesUseCase } from '../domain/ports/in/get-interest-categories.usecase';
import {
  INTEREST_CATEGORY_REPOSITORY_PORT,
  InterestCategoryRepository,
} from '../domain/ports/out/interest-category.repository';
import { InterestCategory } from '../domain/entities/interest-category.entity';

@Injectable()
export class GetInterestCategoriesService implements GetInterestCategoriesUseCase {
  constructor(
    @Inject(INTEREST_CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: InterestCategoryRepository,
  ) {}

  async execute(): Promise<InterestCategory[]> {
    return this.categoryRepository.findAllActive();
  }
}
