import { InterestCategory } from '../../entities/interest-category.entity';

export const INTEREST_CATEGORY_REPOSITORY_PORT = 'INTEREST_CATEGORY_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de categorías de interés
 */
export interface InterestCategoryRepository {
    /**
     * Obtiene todas las categorías activas ordenadas por order
     */
    findAllActive(): Promise<InterestCategory[]>;

    /**
     * Busca una categoría por ID
     */
    findById(id: string): Promise<InterestCategory | null>;

    /**
     * Busca una categoría por slug
     */
    findBySlug(slug: string): Promise<InterestCategory | null>;

    /**
     * Busca múltiples categorías por sus IDs
     */
    findByIds(ids: string[]): Promise<InterestCategory[]>;

    /**
     * Guarda una categoría
     */
    save(category: InterestCategory): Promise<InterestCategory>;
}
