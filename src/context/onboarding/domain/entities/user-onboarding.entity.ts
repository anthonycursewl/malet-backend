/**
 * Primitivas de la entidad UserOnboarding
 */
export interface UserOnboardingPrimitives {
  id: string;
  userId: string;
  completed: boolean;
  stepInterests: boolean;
  stepCommunities: boolean;
  stepProfile: boolean;
  skipped: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad de dominio UserOnboarding
 * Representa el estado del onboarding de un usuario
 */
export class UserOnboarding {
  private readonly id: string;
  private readonly userId: string;
  private readonly completed: boolean;
  private readonly stepInterests: boolean;
  private readonly stepCommunities: boolean;
  private readonly stepProfile: boolean;
  private readonly skipped: boolean;
  private readonly completedAt: Date | null;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  constructor(params: UserOnboardingPrimitives) {
    this.id = params.id;
    this.userId = params.userId;
    this.completed = params.completed;
    this.stepInterests = params.stepInterests;
    this.stepCommunities = params.stepCommunities;
    this.stepProfile = params.stepProfile;
    this.skipped = params.skipped;
    this.completedAt = params.completedAt;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Crea un nuevo onboarding para un usuario
   */
  static create(userId: string): UserOnboarding {
    return new UserOnboarding({
      id: crypto.randomUUID().split('-')[4],
      userId,
      completed: false,
      stepInterests: false,
      stepCommunities: false,
      stepProfile: false,
      skipped: false,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Getters
  getId(): string {
    return this.id;
  }
  getUserId(): string {
    return this.userId;
  }
  isCompleted(): boolean {
    return this.completed;
  }
  hasCompletedInterests(): boolean {
    return this.stepInterests;
  }
  hasCompletedCommunities(): boolean {
    return this.stepCommunities;
  }
  hasCompletedProfile(): boolean {
    return this.stepProfile;
  }
  wasSkipped(): boolean {
    return this.skipped;
  }
  getCompletedAt(): Date | null {
    return this.completedAt;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Calcula el progreso del onboarding (0-100)
   */
  getProgress(): number {
    if (this.completed || this.skipped) return 100;

    let progress = 0;
    if (this.stepInterests) progress += 40;
    if (this.stepCommunities) progress += 40;
    if (this.stepProfile) progress += 20;

    return progress;
  }

  /**
   * Verifica si necesita completar el onboarding
   */
  needsOnboarding(): boolean {
    return !this.completed && !this.skipped;
  }

  /**
   * Obtiene el siguiente paso pendiente
   */
  getNextStep(): 'interests' | 'communities' | 'profile' | 'complete' {
    if (!this.stepInterests) return 'interests';
    if (!this.stepCommunities) return 'communities';
    if (!this.stepProfile) return 'profile';
    return 'complete';
  }

  toPrimitives(): UserOnboardingPrimitives {
    return {
      id: this.id,
      userId: this.userId,
      completed: this.completed,
      stepInterests: this.stepInterests,
      stepCommunities: this.stepCommunities,
      stepProfile: this.stepProfile,
      skipped: this.skipped,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromPrimitives(primitives: UserOnboardingPrimitives): UserOnboarding {
    return new UserOnboarding(primitives);
  }
}
