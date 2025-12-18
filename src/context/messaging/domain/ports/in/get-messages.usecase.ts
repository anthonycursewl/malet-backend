import { Message } from '../../entities/message.entity';

export const GET_MESSAGES_USECASE = 'GET_MESSAGES_USECASE';

/**
 * Parámetros para obtener mensajes
 */
export interface GetMessagesParams {
    conversationId: string;
    limit?: number;
    before?: Date; // Para paginación basada en cursor
    after?: Date;
}

/**
 * Información del remitente
 */
export interface SenderInfo {
    userId: string;
    username: string;
    avatarUrl: string | null;
}

/**
 * Mensaje con información del remitente
 */
export interface MessageWithSender {
    message: Message;
    sender: SenderInfo;
}

/**
 * Resultado de obtener mensajes
 */
export interface GetMessagesResult {
    messages: MessageWithSender[];
    hasMore: boolean;
    oldestMessageDate: Date | null;
    newestMessageDate: Date | null;
}

/**
 * Puerto de entrada para obtener mensajes de una conversación
 */
export interface GetMessagesUseCase {
    /**
     * Obtiene mensajes de una conversación (paginados)
     */
    execute(userId: string, params: GetMessagesParams): Promise<GetMessagesResult>;

    /**
     * Obtiene un mensaje específico por ID
     */
    getById(userId: string, messageId: string): Promise<MessageWithSender | null>;
}
