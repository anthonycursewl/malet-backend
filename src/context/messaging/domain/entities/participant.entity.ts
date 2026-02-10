import { ParticipantRole } from '../enums/participant-role.enum';

/**
 * Primitivas de la entidad ConversationParticipant
 */
export interface ParticipantPrimitives {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt: Date | null;
  muted: boolean;
  isActive: boolean;
}

/**
 * Entidad de dominio ConversationParticipant
 * Representa un participante en una conversación
 */
export class ConversationParticipant {
  private readonly id: string;
  private readonly conversationId: string;
  private readonly userId: string;
  private readonly role: ParticipantRole;
  private readonly joinedAt: Date;
  private readonly lastReadAt: Date | null;
  private readonly muted: boolean;
  private readonly isActive: boolean;

  private constructor(params: ParticipantPrimitives) {
    this.id = params.id;
    this.conversationId = params.conversationId;
    this.userId = params.userId;
    this.role = params.role;
    this.joinedAt = params.joinedAt;
    this.lastReadAt = params.lastReadAt;
    this.muted = params.muted;
    this.isActive = params.isActive;
  }

  /**
   * Crea un nuevo participante como miembro
   */
  static create(
    conversationId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): ConversationParticipant {
    return new ConversationParticipant({
      id: crypto.randomUUID(),
      conversationId,
      userId,
      role,
      joinedAt: new Date(),
      lastReadAt: null,
      muted: false,
      isActive: true,
    });
  }

  /**
   * Crea un participante como admin (para creadores de conversación)
   */
  static createAsAdmin(
    conversationId: string,
    userId: string,
  ): ConversationParticipant {
    return ConversationParticipant.create(
      conversationId,
      userId,
      ParticipantRole.ADMIN,
    );
  }

  // Getters
  getId(): string {
    return this.id;
  }
  getConversationId(): string {
    return this.conversationId;
  }
  getUserId(): string {
    return this.userId;
  }
  getRole(): ParticipantRole {
    return this.role;
  }
  getJoinedAt(): Date {
    return this.joinedAt;
  }
  getLastReadAt(): Date | null {
    return this.lastReadAt;
  }
  isMuted(): boolean {
    return this.muted;
  }
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Verifica si es admin
   */
  isAdmin(): boolean {
    return this.role === ParticipantRole.ADMIN;
  }

  /**
   * Verifica si tiene mensajes sin leer después de cierta fecha
   */
  hasUnreadMessagesSince(messageDate: Date): boolean {
    if (!this.lastReadAt) return true;
    return messageDate > this.lastReadAt;
  }

  /**
   * Crea una copia con lastReadAt actualizado
   */
  withLastReadAt(date: Date): ConversationParticipant {
    return new ConversationParticipant({
      ...this.toPrimitives(),
      lastReadAt: date,
    });
  }

  /**
   * Crea una copia con muted actualizado
   */
  withMuted(muted: boolean): ConversationParticipant {
    return new ConversationParticipant({
      ...this.toPrimitives(),
      muted,
    });
  }

  /**
   * Crea una copia marcada como inactiva (salió de la conversación)
   */
  asInactive(): ConversationParticipant {
    return new ConversationParticipant({
      ...this.toPrimitives(),
      isActive: false,
    });
  }

  toPrimitives(): ParticipantPrimitives {
    return {
      id: this.id,
      conversationId: this.conversationId,
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt,
      lastReadAt: this.lastReadAt,
      muted: this.muted,
      isActive: this.isActive,
    };
  }

  static fromPrimitives(
    primitives: ParticipantPrimitives,
  ): ConversationParticipant {
    return new ConversationParticipant(primitives);
  }
}
