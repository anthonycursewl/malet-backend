import { UserInterest } from '../../entities/user-interest.entity';

export const USER_INTEREST_REPOSITORY_PORT = 'USER_INTEREST_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de intereses del usuario
 */
export interface UserInterestRepository {
  /**
   * Guarda un interés del usuario
   */
  save(interest: UserInterest): Promise<UserInterest>;

  /**
   * Guarda múltiples intereses del usuario
   */
  saveMany(interests: UserInterest[]): Promise<UserInterest[]>;

  /**
   * Obtiene todos los intereses de un usuario
   */
  findByUserId(userId: string): Promise<UserInterest[]>;

  /**
   * Busca un interés específico de un usuario
   */
  findByUserAndCategory(
    userId: string,
    categoryId: string,
  ): Promise<UserInterest | null>;

  /**
   * Actualiza el peso de un interés
   */
  updateWeight(id: string, weight: number): Promise<UserInterest>;

  /**
   * Elimina todos los intereses de un usuario
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Elimina un interés específico
   */
  delete(id: string): Promise<void>;
}
