import { Conversation } from '../../entities/conversation.entity';

export const GET_CONVERSATIONS_USECASE = 'GET_CONVERSATIONS_USECASE';

/**
 * Parámetros para obtener conversaciones
 */
export interface GetConversationsParams {
  page?: number;
  limit?: number;
  type?: 'private' | 'community' | 'all';
}

/**
 * Información resumida de un participante
 */
export interface ParticipantInfo {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

/**
 * Resumen de la última actividad de una conversación
 */
export interface ConversationSummary {
  conversation: Conversation;
  participants: ParticipantInfo[];
  lastMessage: {
    senderId: string;
    senderUsername: string;
    type: string;
    createdAt: Date;
    // No incluimos contenido porque está encriptado
  } | null;
  unreadCount: number;
}

/**
 * Resultado paginado de conversaciones
 */
export interface GetConversationsResult {
  conversations: ConversationSummary[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Puerto de entrada para obtener las conversaciones de un usuario
 */
export interface GetConversationsUseCase {
  /**
   * Obtiene todas las conversaciones del usuario
   */
  execute(
    userId: string,
    params?: GetConversationsParams,
  ): Promise<GetConversationsResult>;

  /**
   * Obtiene una conversación específica por ID
   */
  getById(
    userId: string,
    conversationId: string,
  ): Promise<ConversationSummary | null>;
}
