/**
 * Puerto de salida para Pub/Sub (escalabilidad multi-servidor)
 * 
 * Esta interfaz abstrae la implementación de Pub/Sub para permitir
 * cambiar de Redis a otro sistema (Kafka, RabbitMQ, etc.) sin
 * modificar la lógica de negocio.
 */
export const PUBSUB_PORT = 'PUBSUB_PORT';

/**
 * Evento de nuevo mensaje
 */
export interface MessageEvent {
    messageId: string;
    conversationId: string;
    senderId: string;
    participantIds: string[];
    createdAt: Date;
}

/**
 * Evento de lectura de mensaje
 */
export interface ReadReceiptEvent {
    conversationId: string;
    messageId: string;
    userId: string;
    readAt: Date;
}

/**
 * Evento de typing
 */
export interface TypingEvent {
    conversationId: string;
    userId: string;
    isTyping: boolean;
}

/**
 * Evento de presencia
 */
export interface PresenceEvent {
    userId: string;
    status: 'online' | 'away' | 'offline';
    lastSeen: Date;
}

/**
 * Puerto de Pub/Sub para comunicación entre servidores
 */
export interface PubSubPort {
    /**
     * Publica un evento de nuevo mensaje
     */
    publishMessage(event: MessageEvent): Promise<void>;

    /**
     * Publica un evento de lectura
     */
    publishReadReceipt(event: ReadReceiptEvent): Promise<void>;

    /**
     * Publica un evento de typing
     */
    publishTyping(event: TypingEvent): Promise<void>;

    /**
     * Publica un evento de presencia
     */
    publishPresence(event: PresenceEvent): Promise<void>;

    /**
     * Suscribirse a eventos de mensajes
     */
    subscribeToMessages(callback: (event: MessageEvent) => void): Promise<void>;

    /**
     * Suscribirse a eventos de lectura
     */
    subscribeToReadReceipts(callback: (event: ReadReceiptEvent) => void): Promise<void>;

    /**
     * Suscribirse a eventos de typing
     */
    subscribeToTyping(callback: (event: TypingEvent) => void): Promise<void>;

    /**
     * Suscribirse a eventos de presencia
     */
    subscribeToPresence(callback: (event: PresenceEvent) => void): Promise<void>;
}
