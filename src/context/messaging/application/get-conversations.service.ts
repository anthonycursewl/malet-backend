import { Injectable, Inject } from '@nestjs/common';
import {
    GetConversationsUseCase,
    GetConversationsParams,
    GetConversationsResult,
    ConversationSummary,
    ParticipantInfo
} from '../domain/ports/in/get-conversations.usecase';
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
import { ConversationType } from '../domain/enums/conversation-type.enum';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GetConversationsService implements GetConversationsUseCase {
    constructor(
        @Inject(CONVERSATION_REPOSITORY_PORT)
        private readonly conversationRepository: ConversationRepository,
        @Inject(PARTICIPANT_REPOSITORY_PORT)
        private readonly participantRepository: ParticipantRepository,
        @Inject(MESSAGE_REPOSITORY_PORT)
        private readonly messageRepository: MessageRepository,
        private readonly prisma: PrismaService
    ) { }

    async execute(userId: string, params?: GetConversationsParams): Promise<GetConversationsResult> {
        const page = params?.page || 1;
        const limit = Math.min(params?.limit || 20, 50);
        const offset = (page - 1) * limit;

        // Determinar tipo de conversación a filtrar
        let type: ConversationType | undefined;
        if (params?.type === 'private') type = ConversationType.PRIVATE;
        if (params?.type === 'community') type = ConversationType.COMMUNITY;

        // Obtener conversaciones del usuario
        const conversations = await this.conversationRepository.findByUserId(userId, type, limit, offset);
        const total = await this.conversationRepository.countByUserId(userId, type);

        // Construir summaries para cada conversación
        const summaries: ConversationSummary[] = [];

        for (const conversation of conversations) {
            const summary = await this.buildConversationSummary(conversation.getId(), userId);
            if (summary) {
                summaries.push(summary);
            }
        }

        const totalPages = Math.ceil(total / limit);

        return {
            conversations: summaries,
            total,
            page,
            totalPages,
            hasMore: page < totalPages
        };
    }

    async getById(userId: string, conversationId: string): Promise<ConversationSummary | null> {
        // Verificar que el usuario es participante
        const participant = await this.participantRepository.findByConversationAndUser(
            conversationId,
            userId
        );

        if (!participant || !participant.getIsActive()) {
            return null;
        }

        return this.buildConversationSummary(conversationId, userId);
    }

    private async buildConversationSummary(
        conversationId: string,
        userId: string
    ): Promise<ConversationSummary | null> {
        const conversation = await this.conversationRepository.findById(conversationId);
        if (!conversation) return null;

        // Obtener participantes
        const participants = await this.participantRepository.findByConversationId(conversationId, true);

        // Obtener info de usuarios
        const userIds = participants.map(p => p.getUserId());
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, avatar_url: true }
        });

        const userMap = new Map(users.map(u => [u.id, u]));
        const participantInfos: ParticipantInfo[] = participants.map(p => {
            const user = userMap.get(p.getUserId());
            return {
                userId: p.getUserId(),
                username: user?.username || 'Unknown',
                avatarUrl: user?.avatar_url || null
            };
        });

        // Obtener último mensaje
        const lastMessage = await this.messageRepository.findLastByConversationId(conversationId);
        let lastMessageInfo = null;

        if (lastMessage && !lastMessage.isDeleted()) {
            const sender = userMap.get(lastMessage.getSenderId());
            lastMessageInfo = {
                senderId: lastMessage.getSenderId(),
                senderUsername: sender?.username || 'Unknown',
                type: lastMessage.getType(),
                createdAt: lastMessage.getCreatedAt()
            };
        }

        // Contar mensajes no leídos
        const unreadCount = await this.participantRepository.countUnreadMessages(conversationId, userId);

        return {
            conversation,
            participants: participantInfos,
            lastMessage: lastMessageInfo,
            unreadCount
        };
    }
}
