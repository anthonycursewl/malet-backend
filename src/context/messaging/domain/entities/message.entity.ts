import { MessageType } from '../enums/message-type.enum';

/**
 * Contenido encriptado del mensaje
 */
export interface EncryptedContent {
  encryptedContent: string; // Base64 del contenido encriptado
  encryptedKeys: Record<string, string>; // { recipientId: encryptedKey } Base64
  iv: string; // Base64 del IV
  tag: string; // Base64 del auth tag
}

/**
 * Primitivas de la entidad Message
 */
export interface MessagePrimitives {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  encryptedKeys: Record<string, string>;
  contentIv: string;
  contentTag: string;
  type: MessageType;
  replyToId: string | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

/**
 * Entidad de dominio Message
 * Representa un mensaje encriptado E2E
 *
 * IMPORTANTE: El servidor NUNCA tiene acceso al contenido desencriptado.
 * Solo almacena los datos encriptados que serán desencriptados por los clientes.
 */
export class Message {
  private readonly id: string;
  private readonly conversationId: string;
  private readonly senderId: string;
  private readonly encryptedContent: string;
  private readonly encryptedKeys: Record<string, string>;
  private readonly contentIv: string;
  private readonly contentTag: string;
  private readonly type: MessageType;
  private readonly replyToId: string | null;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;
  private readonly editedAt: Date | null;
  private readonly deletedAt: Date | null;

  private constructor(params: MessagePrimitives) {
    this.id = params.id;
    this.conversationId = params.conversationId;
    this.senderId = params.senderId;
    this.encryptedContent = params.encryptedContent;
    this.encryptedKeys = params.encryptedKeys;
    this.contentIv = params.contentIv;
    this.contentTag = params.contentTag;
    this.type = params.type;
    this.replyToId = params.replyToId;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.editedAt = params.editedAt;
    this.deletedAt = params.deletedAt;
  }

  /**
   * Crea un nuevo mensaje encriptado
   */
  static create(
    conversationId: string,
    senderId: string,
    encrypted: EncryptedContent,
    type: MessageType = MessageType.TEXT,
    replyToId?: string,
  ): Message {
    const now = new Date();
    return new Message({
      id: crypto.randomUUID(),
      conversationId,
      senderId,
      encryptedContent: encrypted.encryptedContent,
      encryptedKeys: encrypted.encryptedKeys,
      contentIv: encrypted.iv,
      contentTag: encrypted.tag,
      type,
      replyToId: replyToId || null,
      createdAt: now,
      updatedAt: now,
      editedAt: null,
      deletedAt: null,
    });
  }

  /**
   * Crea un mensaje de sistema (no encriptado)
   */
  static createSystemMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Message {
    const now = new Date();
    return new Message({
      id: crypto.randomUUID(),
      conversationId,
      senderId,
      encryptedContent: content, // No encriptado para mensajes de sistema
      encryptedKeys: {},
      contentIv: '',
      contentTag: '',
      type: MessageType.SYSTEM,
      replyToId: null,
      createdAt: now,
      updatedAt: now,
      editedAt: null,
      deletedAt: null,
    });
  }

  // Getters
  getId(): string {
    return this.id;
  }
  getConversationId(): string {
    return this.conversationId;
  }
  getSenderId(): string {
    return this.senderId;
  }
  getEncryptedContent(): string {
    return this.encryptedContent;
  }
  getEncryptedKeys(): Record<string, string> {
    return { ...this.encryptedKeys };
  }
  getContentIv(): string {
    return this.contentIv;
  }
  getContentTag(): string {
    return this.contentTag;
  }
  getType(): MessageType {
    return this.type;
  }
  getReplyToId(): string | null {
    return this.replyToId;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
  getEditedAt(): Date | null {
    return this.editedAt;
  }
  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  /**
   * Verifica si el mensaje ha sido eliminado
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * Verifica si el mensaje ha sido editado
   */
  isEdited(): boolean {
    return this.editedAt !== null;
  }

  /**
   * Verifica si es un mensaje de sistema
   */
  isSystemMessage(): boolean {
    return this.type === MessageType.SYSTEM;
  }

  /**
   * Verifica si es una respuesta a otro mensaje
   */
  isReply(): boolean {
    return this.replyToId !== null;
  }

  /**
   * Obtiene la clave encriptada para un destinatario específico
   */
  getEncryptedKeyFor(userId: string): string | null {
    return this.encryptedKeys[userId] || null;
  }

  /**
   * Crea una copia editada del mensaje
   */
  asEdited(newEncryptedContent: EncryptedContent): Message {
    return new Message({
      ...this.toPrimitives(),
      encryptedContent: newEncryptedContent.encryptedContent,
      encryptedKeys: newEncryptedContent.encryptedKeys,
      contentIv: newEncryptedContent.iv,
      contentTag: newEncryptedContent.tag,
      editedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Crea una copia marcada como eliminada
   */
  asDeleted(): Message {
    return new Message({
      ...this.toPrimitives(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  toPrimitives(): MessagePrimitives {
    return {
      id: this.id,
      conversationId: this.conversationId,
      senderId: this.senderId,
      encryptedContent: this.encryptedContent,
      encryptedKeys: { ...this.encryptedKeys },
      contentIv: this.contentIv,
      contentTag: this.contentTag,
      type: this.type,
      replyToId: this.replyToId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      editedAt: this.editedAt,
      deletedAt: this.deletedAt,
    };
  }

  static fromPrimitives(primitives: MessagePrimitives): Message {
    return new Message(primitives);
  }
}
