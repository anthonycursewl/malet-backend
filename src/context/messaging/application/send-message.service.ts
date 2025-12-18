import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
    SendMessageUseCase,
    SendMessageParams,
    SendMessageResult
} from '../domain/ports/in/send-message.usecase';
import {
    CONVERSATION_REPOSITORY_PORT,
    ConversationRepository
} from '../domain/ports/out/conversation.repository';
import {
    PARTICIPANT_REPOSITORY_PORT,
    ParticipantRepository
} from '../domain/ports/out/participant.repository';
import {
    MESSAGE_REPOSITORY_PORT,
    MessageRepository
} from '../domain/ports/out/message.repository';
import { PUBSUB_PORT, PubSubPort } from '../domain/ports/out/pubsub.port';
import { Message, EncryptedContent } from '../domain/entities/message.entity';
import { MessageType } from '../domain/enums/message-type.enum';

@Injectable()
export class SendMessageService implements SendMessageUseCase {
    constructor(
        @Inject(CONVERSATION_REPOSITORY_PORT)
        private readonly conversationRepository: ConversationRepository,
        @Inject(PARTICIPANT_REPOSITORY_PORT)
        private readonly participantRepository: ParticipantRepository,
        @Inject(MESSAGE_REPOSITORY_PORT)
        private readonly messageRepository: MessageRepository,
        @Inject(PUBSUB_PORT)
        private readonly pubsub: PubSubPort
    ) { }

    async execute(userId: string, params: SendMessageParams): Promise<SendMessageResult> {
        const { conversationId, encryptedContent, encryptedKeys, iv, tag, type, replyToId } = params;

        // Verificar que la conversación existe
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) {
            throw new BadRequestException('La conversación no existe');
        }

        // Verificar que el usuario es participante activo
        const participant = await this.participantRepository.findByConversationAndUser(
            conversationId,
            userId
        );

        if (!participant || !participant.getIsActive()) {
            throw new ForbiddenException('No tienes acceso a esta conversación');
        }

        // Verificar que el mensaje de respuesta existe (si aplica)
        if (replyToId) {
            const replyTo = await this.messageRepository.findById(replyToId);
            if (!replyTo || replyTo.getConversationId() !== conversationId) {
                throw new BadRequestException('El mensaje de respuesta no existe');
            }
        }

        // Crear el mensaje
        const encrypted: EncryptedContent = {
            encryptedContent,
            encryptedKeys,
            iv,
            tag
        };

        const message = Message.create(
            conversationId,
            userId,
            encrypted,
            type || MessageType.TEXT,
            replyToId
        );

        // Guardar el mensaje
        const savedMessage = await this.messageRepository.save(message);

        // Actualizar última fecha de mensaje en la conversación
        await this.conversationRepository.updateLastMessageAt(conversationId, savedMessage.getCreatedAt());

        // Obtener IDs de participantes para notificar
        const participants = await this.participantRepository.findByConversationId(conversationId, true);
        const participantIds = participants.map(p => p.getUserId());

        // Publicar evento para multi-servidor
        await this.pubsub.publishMessage({
            messageId: savedMessage.getId(),
            conversationId,
            senderId: userId,
            participantIds,
            createdAt: savedMessage.getCreatedAt()
        });

        return { message: savedMessage };
    }
}
