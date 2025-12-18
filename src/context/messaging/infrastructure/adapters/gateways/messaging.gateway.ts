import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Ports (3 niveles arriba: gateways -> adapters -> infrastructure -> domain)
import { PUBSUB_PORT, PubSubPort, MessageEvent, TypingEvent, PresenceEvent } from '../../../domain/ports/out/pubsub.port';
import { SEND_MESSAGE_USECASE, SendMessageUseCase } from '../../../domain/ports/in/send-message.usecase';
import { MARK_AS_READ_USECASE, MarkAsReadUseCase } from '../../../domain/ports/in/mark-as-read.usecase';
import { PARTICIPANT_REPOSITORY_PORT, ParticipantRepository } from '../../../domain/ports/out/participant.repository';

// Types
import { MessageType } from '../../../domain/enums/message-type.enum';


/**
 * Datos del usuario autenticado en el socket
 */
interface AuthenticatedSocket extends Socket {
    userId?: string;
    deviceId?: string;
}

/**
 * Datos para enviar mensaje vía WebSocket
 */
interface WsSendMessageData {
    conversationId: string;
    encryptedContent: string;
    encryptedKeys: Record<string, string>;
    iv: string;
    tag: string;
    type?: MessageType;
    replyToId?: string;
}

/**
 * Gateway de WebSocket para mensajería en tiempo real.
 * 
 * Este gateway maneja:
 * - Conexión/desconexión de usuarios
 * - Envío de mensajes
 * - Typing indicators
 * - Notificaciones de lectura
 * - Presencia de usuarios
 * 
 * Está diseñado para funcionar con múltiples servidores
 * usando Redis como PubSub para sincronización.
 */
@WebSocketGateway({
    cors: {
        origin: process.env.WS_CORS_ORIGIN || '*',
        credentials: true
    },
    // namespace: '/messaging', // Comentado para facilitar testing - descomentar en producción
    transports: ['websocket', 'polling']
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MessagingGateway.name);

    // Map de userId -> Set<socketId> (un usuario puede tener múltiples conexiones)
    private userSockets = new Map<string, Set<string>>();

    // Map de socketId -> userId (para lookup rápido en desconexión)
    private socketUsers = new Map<string, string>();

    constructor(
        private readonly jwtService: JwtService,
        @Inject(PUBSUB_PORT)
        private readonly pubsub: PubSubPort,
        @Inject(SEND_MESSAGE_USECASE)
        private readonly sendMessageUseCase: SendMessageUseCase,
        @Inject(MARK_AS_READ_USECASE)
        private readonly markAsReadUseCase: MarkAsReadUseCase,
        @Inject(PARTICIPANT_REPOSITORY_PORT)
        private readonly participantRepository: ParticipantRepository
    ) { }

    /**
     * Inicialización del Gateway
     */
    async afterInit(server: Server) {
        this.logger.log('🔌 WebSocket Gateway initialized');

        // Suscribirse a eventos del PubSub para multi-servidor
        await this.setupPubSubSubscriptions();
    }

    /**
     * Configura las suscripciones al PubSub
     */
    private async setupPubSubSubscriptions() {
        await this.pubsub.subscribeToMessages(async (event: MessageEvent) => {
            await this.broadcastToParticipants(event.participantIds, 'message:new', {
                messageId: event.messageId,
                conversationId: event.conversationId,
                senderId: event.senderId,
                createdAt: event.createdAt
            });
        });

        // Cuando un usuario está escribiendo
        await this.pubsub.subscribeToTyping(async (event: TypingEvent) => {
            const participants = await this.participantRepository.findByConversationId(
                event.conversationId,
                true
            );
            const participantIds = participants
                .map(p => p.getUserId())
                .filter(id => id !== event.userId);

            await this.broadcastToParticipants(participantIds, 'typing', {
                conversationId: event.conversationId,
                userId: event.userId,
                isTyping: event.isTyping
            });
        });

        // Cuando cambia la presencia de un usuario
        await this.pubsub.subscribeToPresence(async (event: PresenceEvent) => {
            // Broadcast a todos los usuarios conectados
            this.server.emit('presence:update', {
                userId: event.userId,
                status: event.status,
                lastSeen: event.lastSeen
            });
        });

        this.logger.log('📡 PubSub subscriptions configured');
    }

    /**
     * Conexión de un cliente
     */
    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extraer y verificar token
            const token = this.extractToken(client);
            if (!token) {
                this.logger.warn(`❌ Connection rejected: No token provided`);
                client.disconnect();
                return;
            }

            const payload = await this.jwtService.verifyAsync(token);
            const userId = payload.userId || payload.sub;

            if (!userId) {
                this.logger.warn(`❌ Connection rejected: Invalid token`);
                client.disconnect();
                return;
            }

            // Guardar datos del usuario en el socket
            client.userId = userId;
            client.deviceId = client.handshake.query.deviceId as string || 'unknown';

            // Registrar conexión
            this.registerUserSocket(userId, client.id);

            // Unir a rooms de sus conversaciones
            await this.joinUserConversations(client, userId);

            // Notificar presencia
            await this.pubsub.publishPresence({
                userId,
                status: 'online',
                lastSeen: new Date()
            });

            this.logger.log(`✅ User connected: ${userId} (socket: ${client.id})`);
        } catch (error) {
            this.logger.error(`❌ Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    /**
     * Desconexión de un cliente
     */
    async handleDisconnect(client: AuthenticatedSocket) {
        const userId = client.userId;

        if (userId) {
            // Remover registro
            this.unregisterUserSocket(userId, client.id);

            // Si no tiene más sockets, marcar como offline
            const userSocketSet = this.userSockets.get(userId);
            if (!userSocketSet || userSocketSet.size === 0) {
                await this.pubsub.publishPresence({
                    userId,
                    status: 'offline',
                    lastSeen: new Date()
                });
            }

            this.logger.log(`👋 User disconnected: ${userId} (socket: ${client.id})`);
        }
    }

    /**
     * Enviar mensaje
     */
    @SubscribeMessage('message:send')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: WsSendMessageData
    ) {
        const userId = client.userId;
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        try {
            const result = await this.sendMessageUseCase.execute(userId, {
                conversationId: data.conversationId,
                encryptedContent: data.encryptedContent,
                encryptedKeys: data.encryptedKeys,
                iv: data.iv,
                tag: data.tag,
                type: data.type,
                replyToId: data.replyToId
            });

            return {
                success: true,
                message: result.message.toPrimitives()
            };
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Marcar mensajes como leídos
     */
    @SubscribeMessage('message:read')
    async handleMarkAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string; messageId?: string }
    ) {
        const userId = client.userId;
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        try {
            const result = await this.markAsReadUseCase.execute(userId, {
                conversationId: data.conversationId,
                messageId: data.messageId
            });

            // El servicio ya publica el evento al PubSub

            return {
                success: true,
                ...result
            };
        } catch (error) {
            this.logger.error(`Error marking as read: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Indicador de typing
     */
    @SubscribeMessage('typing:start')
    async handleTypingStart(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        this.logger.log(`📝 typing:start received from ${client.userId} for conversation ${data?.conversationId}`);
        const userId = client.userId;
        if (!userId) {
            this.logger.warn('typing:start - No userId');
            return { error: 'Not authenticated' };
        }

        try {
            await this.pubsub.publishTyping({
                conversationId: data.conversationId,
                userId,
                isTyping: true
            });
            this.logger.log(`✅ typing:start published successfully`);
            return { success: true };
        } catch (error) {
            this.logger.error(`❌ typing:start error: ${error.message}`);
            return { error: error.message };
        }
    }

    @SubscribeMessage('typing:stop')
    async handleTypingStop(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        this.logger.log(`📝 typing:stop received from ${client.userId}`);
        const userId = client.userId;
        if (!userId) {
            return { error: 'Not authenticated' };
        }

        try {
            await this.pubsub.publishTyping({
                conversationId: data.conversationId,
                userId,
                isTyping: false
            });
            return { success: true };
        } catch (error) {
            this.logger.error(`❌ typing:stop error: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Actualizar presencia
     */
    @SubscribeMessage('presence:update')
    async handlePresenceUpdate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { status: 'online' | 'away' }
    ) {
        const userId = client.userId;
        if (!userId) return;

        await this.pubsub.publishPresence({
            userId,
            status: data.status,
            lastSeen: new Date()
        });
    }

    // ============ HELPERS ============

    /**
     * Extrae el token del handshake
     */
    private extractToken(client: Socket): string | null {
        // Intentar extraer de query params
        const token = client.handshake.query.token as string;
        if (token) return token;

        // Intentar extraer del header Authorization
        const authHeader = client.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }

        return null;
    }

    /**
     * Registra un socket para un usuario
     */
    private registerUserSocket(userId: string, socketId: string) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socketId);
        this.socketUsers.set(socketId, userId);
    }

    /**
     * Desregistra un socket de un usuario
     */
    private unregisterUserSocket(userId: string, socketId: string) {
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
            userSocketSet.delete(socketId);
            if (userSocketSet.size === 0) {
                this.userSockets.delete(userId);
            }
        }
        this.socketUsers.delete(socketId);
    }

    /**
     * Une al usuario a los rooms de sus conversaciones
     */
    private async joinUserConversations(client: Socket, userId: string) {
        const participations = await this.participantRepository.findByUserId(userId, true);

        for (const participation of participations) {
            client.join(`conversation:${participation.getConversationId()}`);
        }

        this.logger.debug(`User ${userId} joined ${participations.length} conversation rooms`);
    }

    /**
     * Envía un mensaje a todos los participantes
     */
    private async broadcastToParticipants(
        participantIds: string[],
        event: string,
        data: any
    ) {
        for (const participantId of participantIds) {
            const socketIds = this.userSockets.get(participantId);
            if (socketIds) {
                for (const socketId of socketIds) {
                    this.server.to(socketId).emit(event, data);
                }
            }
        }
    }

    /**
     * Envía un mensaje a todos los sockets de un usuario
     */
    public emitToUser(userId: string, event: string, data: any) {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            for (const socketId of socketIds) {
                this.server.to(socketId).emit(event, data);
            }
        }
    }

    /**
     * Envía un mensaje a una conversación
     */
    public emitToConversation(conversationId: string, event: string, data: any) {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }
}
