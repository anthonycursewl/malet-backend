import { ConversationParticipant } from '../../entities/participant.entity';
import { ParticipantRole } from '../../enums/participant-role.enum';

export const PARTICIPANT_REPOSITORY_PORT = 'PARTICIPANT_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de participantes
 */
export interface ParticipantRepository {
    /**
     * Guarda un participante
     */
    save(participant: ConversationParticipant): Promise<ConversationParticipant>;

    /**
     * Guarda múltiples participantes
     */
    saveMany(participants: ConversationParticipant[]): Promise<ConversationParticipant[]>;

    /**
     * Busca un participante por ID
     */
    findById(id: string): Promise<ConversationParticipant | null>;

    /**
     * Busca un participante por conversación y usuario
     */
    findByConversationAndUser(conversationId: string, userId: string): Promise<ConversationParticipant | null>;

    /**
     * Obtiene todos los participantes activos de una conversación
     */
    findByConversationId(conversationId: string, activeOnly?: boolean): Promise<ConversationParticipant[]>;

    /**
     * Obtiene todas las conversaciones donde participa un usuario
     */
    findByUserId(userId: string, activeOnly?: boolean): Promise<ConversationParticipant[]>;

    /**
     * Actualiza la fecha de última lectura
     */
    updateLastReadAt(id: string, date: Date): Promise<void>;

    /**
     * Actualiza el rol del participante
     */
    updateRole(id: string, role: ParticipantRole): Promise<void>;

    /**
     * Actualiza el estado de muted
     */
    updateMuted(id: string, muted: boolean): Promise<void>;

    /**
     * Marca un participante como inactivo (salió de la conversación)
     */
    markAsInactive(id: string): Promise<void>;

    /**
     * Cuenta mensajes no leídos para un participante
     */
    countUnreadMessages(conversationId: string, userId: string): Promise<number>;
}
