import { InterestCategory } from '../../entities/interest-category.entity';

export const GET_INTEREST_CATEGORIES_USECASE =
  'GET_INTEREST_CATEGORIES_USECASE';

/**
 * Puerto de entrada para obtener las categorías de interés
 */
export interface GetInterestCategoriesUseCase {
  /**
   * Obtiene todas las categorías de interés activas
   */
  execute(): Promise<InterestCategory[]>;
}
