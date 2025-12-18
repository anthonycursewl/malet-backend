import { Conversation } from '../../entities/conversation.entity';
import { ConversationParticipant } from '../../entities/participant.entity';

export const CREATE_CONVERSATION_USECASE = 'CREATE_CONVERSATION_USECASE';

/**
 * Parámetros para crear una conversación privada
 */
export interface CreatePrivateConversationParams {
    participantUserId: string; // Usuario con quien iniciar la conversación
}

/**
 * Parámetros para crear una conversación de comunidad
 */
export interface CreateCommunityConversationParams {
    communityId: string;
    name: string;
    avatarUrl?: string;
}

/**
 * Resultado de crear una conversación
 */
export interface CreateConversationResult {
    conversation: Conversation;
    participants: ConversationParticipant[];
    isNew: boolean; // false si ya existía (para conversaciones privadas)
}

/**
 * Puerto de entrada para crear conversaciones
 */
export interface CreateConversationUseCase {
    /**
     * Crea o recupera una conversación privada entre dos usuarios
     * Si ya existe, retorna la existente
     */
    createPrivate(userId: string, params: CreatePrivateConversationParams): Promise<CreateConversationResult>;

    /**
     * Crea una conversación para una comunidad
     * Solo puede ser llamado por el owner de la comunidad
     */
    createForCommunity(userId: string, params: CreateCommunityConversationParams): Promise<CreateConversationResult>;
}
