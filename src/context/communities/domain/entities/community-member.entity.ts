import { MemberRole } from '../enums/member-role.enum';
import { MembershipStatus } from '../enums/membership-status.enum';

/**
 * Primitivas de la entidad CommunityMember para serialización/deserialización
 */
export interface CommunityMemberPrimitives {
  id: string;
  communityId: string;
  userId: string;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: Date;
  updatedAt: Date;
}

/**
 * Entidad de dominio CommunityMember
 * Representa la membresía de un usuario en una comunidad
 */
export class CommunityMember {
  private readonly id: string;
  private readonly communityId: string;
  private readonly userId: string;
  private readonly role: MemberRole;
  private readonly status: MembershipStatus;
  private readonly joinedAt: Date;
  private readonly updatedAt: Date;

  constructor(params: CommunityMemberPrimitives) {
    this.id = params.id;
    this.communityId = params.communityId;
    this.userId = params.userId;
    this.role = params.role;
    this.status = params.status;
    this.joinedAt = params.joinedAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Factory method para crear un miembro owner (creador de la comunidad)
   */
  static createOwner(communityId: string, userId: string): CommunityMember {
    return new CommunityMember({
      id: crypto.randomUUID().split('-')[4],
      communityId,
      userId,
      role: MemberRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para crear un miembro regular
   */
  static createMember(
    communityId: string,
    userId: string,
    status: MembershipStatus = MembershipStatus.ACTIVE,
  ): CommunityMember {
    return new CommunityMember({
      id: crypto.randomUUID().split('-')[4],
      communityId,
      userId,
      role: MemberRole.MEMBER,
      status,
      joinedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ============ GETTERS ============

  getId(): string {
    return this.id;
  }

  getCommunityId(): string {
    return this.communityId;
  }

  getUserId(): string {
    return this.userId;
  }

  getRole(): MemberRole {
    return this.role;
  }

  getStatus(): MembershipStatus {
    return this.status;
  }

  getJoinedAt(): Date {
    return this.joinedAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ============ MÉTODOS DE NEGOCIO - ROLES ============

  /**
   * Verifica si el miembro es el owner de la comunidad
   */
  isOwner(): boolean {
    return this.role === MemberRole.OWNER;
  }

  /**
   * Verifica si el miembro es admin
   */
  isAdmin(): boolean {
    return this.role === MemberRole.ADMIN;
  }

  /**
   * Verifica si el miembro es moderador
   */
  isModerator(): boolean {
    return this.role === MemberRole.MODERATOR;
  }

  /**
   * Verifica si el miembro tiene rol de miembro regular
   */
  isMemberRole(): boolean {
    return this.role === MemberRole.MEMBER;
  }

  // ============ MÉTODOS DE NEGOCIO - ESTADOS ============

  /**
   * Verifica si el miembro está activo
   */
  isActive(): boolean {
    return this.status === MembershipStatus.ACTIVE;
  }

  /**
   * Verifica si el miembro tiene solicitud pendiente
   */
  isPending(): boolean {
    return this.status === MembershipStatus.PENDING;
  }

  /**
   * Verifica si el miembro ha sido baneado
   */
  isBanned(): boolean {
    return this.status === MembershipStatus.BANNED;
  }

  /**
   * Verifica si el miembro está suspendido
   */
  isSuspended(): boolean {
    return this.status === MembershipStatus.SUSPENDED;
  }

  // ============ MÉTODOS DE NEGOCIO - PERMISOS ============

  /**
   * Verifica si el miembro puede gestionar otros miembros
   * Solo owners y admins pueden gestionar miembros
   */
  canManageMembers(): boolean {
    return this.role === MemberRole.OWNER || this.role === MemberRole.ADMIN;
  }

  /**
   * Verifica si el miembro puede moderar contenido
   * Owners, admins y moderadores pueden moderar
   */
  canModerate(): boolean {
    return (
      this.role === MemberRole.OWNER ||
      this.role === MemberRole.ADMIN ||
      this.role === MemberRole.MODERATOR
    );
  }

  /**
   * Verifica si el miembro puede editar la configuración de la comunidad
   * Solo owners y admins pueden editar configuración
   */
  canEditSettings(): boolean {
    return this.role === MemberRole.OWNER || this.role === MemberRole.ADMIN;
  }

  /**
   * Verifica si el miembro puede eliminar la comunidad
   * Solo el owner puede eliminar la comunidad
   */
  canDeleteCommunity(): boolean {
    return this.role === MemberRole.OWNER;
  }

  /**
   * Verifica si el miembro puede cambiar roles de otros miembros
   * Solo el owner puede cambiar roles
   */
  canChangeRoles(): boolean {
    return this.role === MemberRole.OWNER;
  }

  /**
   * Verifica si el miembro puede abandonar la comunidad
   * El owner no puede abandonar, debe transferir ownership primero
   */
  canLeave(): boolean {
    return this.role !== MemberRole.OWNER;
  }

  // ============ SERIALIZACIÓN ============

  /**
   * Convierte la entidad a primitivas para persistencia
   */
  toPrimitives(): CommunityMemberPrimitives {
    return {
      id: this.id,
      communityId: this.communityId,
      userId: this.userId,
      role: this.role,
      status: this.status,
      joinedAt: this.joinedAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Crea una entidad CommunityMember desde primitivas
   */
  static fromPrimitives(
    primitives: CommunityMemberPrimitives,
  ): CommunityMember {
    return new CommunityMember(primitives);
  }
}
