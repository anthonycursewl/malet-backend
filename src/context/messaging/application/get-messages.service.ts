import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  GetMessagesUseCase,
  GetMessagesParams,
  GetMessagesResult,
  MessageWithSender,
} from '../domain/ports/in/get-messages.usecase';
import {
  PARTICIPANT_REPOSITORY_PORT,
  ParticipantRepository,
} from '../domain/ports/out/participant.repository';
import {
  MESSAGE_REPOSITORY_PORT,
  MessageRepository,
} from '../domain/ports/out/message.repository';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GetMessagesService implements GetMessagesUseCase {
  constructor(
    @Inject(PARTICIPANT_REPOSITORY_PORT)
    private readonly participantRepository: ParticipantRepository,
    @Inject(MESSAGE_REPOSITORY_PORT)
    private readonly messageRepository: MessageRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    userId: string,
    params: GetMessagesParams,
  ): Promise<GetMessagesResult> {
    const { conversationId, limit = 50, before, after } = params;

    // Verificar que el usuario es participante
    const participant =
      await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId,
      );

    if (!participant || !participant.getIsActive()) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    // Obtener mensajes
    const messages = await this.messageRepository.findByConversationId(
      conversationId,
      limit + 1, // +1 para saber si hay más
      before,
      after,
    );

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Obtener info de remitentes
    const senderIds = [...new Set(resultMessages.map((m) => m.getSenderId()))];
    const senders = await this.prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, username: true, avatar_url: true },
    });

    const senderMap = new Map(senders.map((s) => [s.id, s]));

    // Construir resultado
    const messagesWithSender: MessageWithSender[] = resultMessages.map(
      (message) => {
        const sender = senderMap.get(message.getSenderId());
        return {
          message,
          sender: {
            userId: message.getSenderId(),
            username: sender?.username || 'Unknown',
            avatarUrl: sender?.avatar_url || null,
          },
        };
      },
    );

    return {
      messages: messagesWithSender,
      hasMore,
      oldestMessageDate:
        resultMessages.length > 0
          ? resultMessages[resultMessages.length - 1].getCreatedAt()
          : null,
      newestMessageDate:
        resultMessages.length > 0 ? resultMessages[0].getCreatedAt() : null,
    };
  }

  async getById(
    userId: string,
    messageId: string,
  ): Promise<MessageWithSender | null> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) return null;

    // Verificar que el usuario es participante de la conversación
    const participant =
      await this.participantRepository.findByConversationAndUser(
        message.getConversationId(),
        userId,
      );

    if (!participant || !participant.getIsActive()) {
      return null;
    }

    // Obtener info del remitente
    const sender = await this.prisma.user.findUnique({
      where: { id: message.getSenderId() },
      select: { id: true, username: true, avatar_url: true },
    });

    return {
      message,
      sender: {
        userId: message.getSenderId(),
        username: sender?.username || 'Unknown',
        avatarUrl: sender?.avatar_url || null,
      },
    };
  }
}
