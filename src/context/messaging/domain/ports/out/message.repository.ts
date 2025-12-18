import { Message } from '../../entities/message.entity';

export const MESSAGE_REPOSITORY_PORT = 'MESSAGE_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de mensajes
 */
export interface MessageRepository {
    /**
     * Guarda un mensaje
     */
    save(message: Message): Promise<Message>;

    /**
     * Busca un mensaje por ID
     */
    findById(id: string): Promise<Message | null>;

    /**
     * Obtiene mensajes de una conversación (paginados por cursor)
     */
    findByConversationId(
        conversationId: string,
        limit: number,
        before?: Date,
        after?: Date
    ): Promise<Message[]>;

    /**
     * Obtiene el último mensaje de una conversación
     */
    findLastByConversationId(conversationId: string): Promise<Message | null>;

    /**
     * Cuenta mensajes en una conversación después de cierta fecha
     */
    countAfterDate(conversationId: string, date: Date): Promise<number>;

    /**
     * Actualiza un mensaje (para ediciones)
     */
    update(message: Message): Promise<Message>;

    /**
     * Marca un mensaje como eliminado (soft delete)
     */
    softDelete(id: string): Promise<void>;

    /**
     * Obtiene mensajes no leídos por un usuario en una conversación
     */
    findUnreadByUser(conversationId: string, userId: string, lastReadAt: Date): Promise<Message[]>;
}
