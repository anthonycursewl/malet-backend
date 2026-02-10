import { CommunityType } from '../enums/community-type.enum';

/**
 * Primitivas de la entidad Community para serialización/deserialización
 */
export interface CommunityPrimitives {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  type: CommunityType;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parámetros para crear una nueva comunidad
 */
export interface CreateCommunityParams {
  name: string;
  description?: string | null;
  slug: string;
  type: CommunityType;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ownerId: string;
}

/**
 * Entidad de dominio Community
 * Representa una comunidad en la aplicación
 */
export class Community {
  private readonly id: string;
  private readonly name: string;
  private readonly description: string | null;
  private readonly slug: string;
  private readonly type: CommunityType;
  private readonly avatarUrl: string | null;
  private readonly bannerUrl: string | null;
  private readonly memberCount: number;
  private readonly isActive: boolean;
  private readonly ownerId: string;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  constructor(params: CommunityPrimitives) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.slug = params.slug;
    this.type = params.type;
    this.avatarUrl = params.avatarUrl;
    this.bannerUrl = params.bannerUrl;
    this.memberCount = params.memberCount;
    this.isActive = params.isActive;
    this.ownerId = params.ownerId;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Factory method para crear una nueva comunidad
   */
  static create(params: CreateCommunityParams): Community {
    return new Community({
      id: crypto.randomUUID().split('-')[4],
      name: params.name,
      description: params.description || null,
      slug: params.slug,
      type: params.type,
      avatarUrl: params.avatarUrl || null,
      bannerUrl: params.bannerUrl || null,
      memberCount: 1,
      isActive: true,
      ownerId: params.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Genera un slug único a partir del nombre de la comunidad
   * @param name Nombre de la comunidad
   * @returns Slug normalizado y único
   */
  static generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Date.now().toString(36)
    );
  }

  // ============ GETTERS ============

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getSlug(): string {
    return this.slug;
  }

  getType(): CommunityType {
    return this.type;
  }

  getAvatarUrl(): string | null {
    return this.avatarUrl;
  }

  getBannerUrl(): string | null {
    return this.bannerUrl;
  }

  getMemberCount(): number {
    return this.memberCount;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ============ MÉTODOS DE NEGOCIO ============

  /**
   * Verifica si la comunidad es pública
   */
  isPublic(): boolean {
    return this.type === CommunityType.PUBLIC;
  }

  /**
   * Verifica si la comunidad es privada
   */
  isPrivate(): boolean {
    return this.type === CommunityType.PRIVATE;
  }

  /**
   * Verifica si la comunidad es premium
   */
  isPremium(): boolean {
    return this.type === CommunityType.PREMIUM;
  }

  /**
   * Verifica si un usuario es el owner de la comunidad
   */
  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  /**
   * Verifica si los usuarios pueden unirse directamente
   */
  canJoinDirectly(): boolean {
    return this.isPublic() && this.isActive;
  }

  /**
   * Verifica si la comunidad requiere aprobación para unirse
   */
  requiresApproval(): boolean {
    return this.isPrivate() || this.isPremium();
  }

  // ============ SERIALIZACIÓN ============

  /**
   * Convierte la entidad a primitivas para persistencia
   */
  toPrimitives(): CommunityPrimitives {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      slug: this.slug,
      type: this.type,
      avatarUrl: this.avatarUrl,
      bannerUrl: this.bannerUrl,
      memberCount: this.memberCount,
      isActive: this.isActive,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Crea una entidad Community desde primitivas
   */
  static fromPrimitives(primitives: CommunityPrimitives): Community {
    return new Community(primitives);
  }
}
