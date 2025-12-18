import { Conversation } from '../../entities/conversation.entity';
import { ConversationType } from '../../enums/conversation-type.enum';

export const CONVERSATION_REPOSITORY_PORT = 'CONVERSATION_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de conversaciones
 */
export interface ConversationRepository {
    /**
     * Guarda una conversación
     */
    save(conversation: Conversation): Promise<Conversation>;

    /**
     * Busca una conversación por ID
     */
    findById(id: string): Promise<Conversation | null>;

    /**
     * Busca la conversación de una comunidad
     */
    findByCommunityId(communityId: string): Promise<Conversation | null>;

    /**
     * Busca una conversación privada entre dos usuarios
     */
    findPrivateBetweenUsers(userId1: string, userId2: string): Promise<Conversation | null>;

    /**
     * Obtiene las conversaciones de un usuario (paginadas)
     */
    findByUserId(
        userId: string,
        type?: ConversationType,
        limit?: number,
        offset?: number
    ): Promise<Conversation[]>;

    /**
     * Cuenta las conversaciones de un usuario
     */
    countByUserId(userId: string, type?: ConversationType): Promise<number>;

    /**
     * Actualiza la fecha del último mensaje
     */
    updateLastMessageAt(id: string, date: Date): Promise<void>;

    /**
     * Elimina una conversación
     */
    delete(id: string): Promise<void>;
}
