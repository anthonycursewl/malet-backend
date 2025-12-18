import { Injectable, Logger } from '@nestjs/common';
import {
    PubSubPort,
    MessageEvent,
    ReadReceiptEvent,
    TypingEvent,
    PresenceEvent
} from '../../domain/ports/out/pubsub.port';

/**
 * Implementación en memoria del PubSub.
 * 
 * Esta implementación es para desarrollo y servidor único.
 * Para producción con múltiples servidores, reemplazar con RedisPubSubAdapter.
 * 
 * IMPORTANTE: Esta clase está diseñada para ser intercambiable.
 * Solo cambia el provider en el módulo para cambiar la implementación.
 */
@Injectable()
export class InMemoryPubSubAdapter implements PubSubPort {
    private readonly logger = new Logger(InMemoryPubSubAdapter.name);

    // Callbacks registrados para cada tipo de evento
    private messageCallbacks: ((event: MessageEvent) => void)[] = [];
    private readReceiptCallbacks: ((event: ReadReceiptEvent) => void)[] = [];
    private typingCallbacks: ((event: TypingEvent) => void)[] = [];
    private presenceCallbacks: ((event: PresenceEvent) => void)[] = [];

    constructor() {
        this.logger.log('📡 InMemory PubSub initialized (single server mode)');
    }

    async publishMessage(event: MessageEvent): Promise<void> {
        this.logger.debug(`📤 Publishing message: ${event.messageId}`);

        // Notificar a todos los callbacks registrados
        for (const callback of this.messageCallbacks) {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in message callback', error);
            }
        }
    }

    async publishReadReceipt(event: ReadReceiptEvent): Promise<void> {
        this.logger.debug(`📤 Publishing read receipt: ${event.messageId}`);

        for (const callback of this.readReceiptCallbacks) {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in read receipt callback', error);
            }
        }
    }

    async publishTyping(event: TypingEvent): Promise<void> {
        this.logger.debug(`📤 Publishing typing: ${event.userId} in ${event.conversationId}`);

        for (const callback of this.typingCallbacks) {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in typing callback', error);
            }
        }
    }

    async publishPresence(event: PresenceEvent): Promise<void> {
        this.logger.debug(`📤 Publishing presence: ${event.userId} -> ${event.status}`);

        for (const callback of this.presenceCallbacks) {
            try {
                callback(event);
            } catch (error) {
                this.logger.error('Error in presence callback', error);
            }
        }
    }

    async subscribeToMessages(callback: (event: MessageEvent) => void): Promise<void> {
        this.messageCallbacks.push(callback);
        this.logger.debug('📥 Subscribed to message events');
    }

    async subscribeToReadReceipts(callback: (event: ReadReceiptEvent) => void): Promise<void> {
        this.readReceiptCallbacks.push(callback);
        this.logger.debug('📥 Subscribed to read receipt events');
    }

    async subscribeToTyping(callback: (event: TypingEvent) => void): Promise<void> {
        this.typingCallbacks.push(callback);
        this.logger.debug('📥 Subscribed to typing events');
    }

    async subscribeToPresence(callback: (event: PresenceEvent) => void): Promise<void> {
        this.presenceCallbacks.push(callback);
        this.logger.debug('📥 Subscribed to presence events');
    }
}
