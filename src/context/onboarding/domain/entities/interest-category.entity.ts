/**
 * Primitivas de la entidad InterestCategory
 */
export interface InterestCategoryPrimitives {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Entidad de dominio InterestCategory
 * Representa una categoría de interés para onboarding y recomendaciones
 */
export class InterestCategory {
  private readonly id: string;
  private readonly name: string;
  private readonly slug: string;
  private readonly description: string | null;
  private readonly icon: string | null;
  private readonly color: string | null;
  private readonly order: number;
  private readonly isActive: boolean;
  private readonly createdAt: Date;

  constructor(params: InterestCategoryPrimitives) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
    this.description = params.description;
    this.icon = params.icon;
    this.color = params.color;
    this.order = params.order;
    this.isActive = params.isActive;
    this.createdAt = params.createdAt;
  }

  static create(
    params: Omit<InterestCategoryPrimitives, 'id' | 'createdAt' | 'isActive'>,
  ): InterestCategory {
    return new InterestCategory({
      id: crypto.randomUUID().split('-')[4],
      ...params,
      isActive: true,
      createdAt: new Date(),
    });
  }

  // Getters
  getId(): string {
    return this.id;
  }
  getName(): string {
    return this.name;
  }
  getSlug(): string {
    return this.slug;
  }
  getDescription(): string | null {
    return this.description;
  }
  getIcon(): string | null {
    return this.icon;
  }
  getColor(): string | null {
    return this.color;
  }
  getOrder(): number {
    return this.order;
  }
  getIsActive(): boolean {
    return this.isActive;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }

  toPrimitives(): InterestCategoryPrimitives {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      icon: this.icon,
      color: this.color,
      order: this.order,
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }

  static fromPrimitives(
    primitives: InterestCategoryPrimitives,
  ): InterestCategory {
    return new InterestCategory(primitives);
  }
}
