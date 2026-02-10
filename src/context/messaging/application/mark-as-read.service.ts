import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  MarkAsReadUseCase,
  MarkAsReadParams,
  MarkAsReadResult,
} from '../domain/ports/in/mark-as-read.usecase';
import {
  PARTICIPANT_REPOSITORY_PORT,
  ParticipantRepository,
} from '../domain/ports/out/participant.repository';
import {
  MESSAGE_REPOSITORY_PORT,
  MessageRepository,
} from '../domain/ports/out/message.repository';
import { PUBSUB_PORT, PubSubPort } from '../domain/ports/out/pubsub.port';

@Injectable()
export class MarkAsReadService implements MarkAsReadUseCase {
  constructor(
    @Inject(PARTICIPANT_REPOSITORY_PORT)
    private readonly participantRepository: ParticipantRepository,
    @Inject(MESSAGE_REPOSITORY_PORT)
    private readonly messageRepository: MessageRepository,
    @Inject(PUBSUB_PORT)
    private readonly pubsub: PubSubPort,
  ) {}

  async execute(
    userId: string,
    params: MarkAsReadParams,
  ): Promise<MarkAsReadResult> {
    const { conversationId, messageId } = params;

    // Verificar que el usuario es participante
    const participant =
      await this.participantRepository.findByConversationAndUser(
        conversationId,
        userId,
      );

    if (!participant || !participant.getIsActive()) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    const lastReadAt = new Date();
    let markedCount = 0;

    if (messageId) {
      // Marcar hasta un mensaje específico
      const message = await this.messageRepository.findById(messageId);
      if (message && message.getConversationId() === conversationId) {
        // Contar cuántos se marcan
        const previousLastRead = participant.getLastReadAt();
        if (previousLastRead) {
          markedCount = await this.messageRepository.countAfterDate(
            conversationId,
            previousLastRead,
          );
        } else {
          // Si nunca leyó, contar todos hasta este mensaje
          markedCount = await this.messageRepository.countAfterDate(
            conversationId,
            new Date(0),
          );
        }
      }
    } else {
      // Marcar todos como leídos
      const previousLastRead = participant.getLastReadAt();
      if (previousLastRead) {
        markedCount = await this.messageRepository.countAfterDate(
          conversationId,
          previousLastRead,
        );
      } else {
        markedCount = await this.messageRepository.countAfterDate(
          conversationId,
          new Date(0),
        );
      }
    }

    // Actualizar última lectura
    await this.participantRepository.updateLastReadAt(
      participant.getId(),
      lastReadAt,
    );

    // Publicar evento de lectura (para multi-servidor)
    await this.pubsub.publishReadReceipt({
      conversationId,
      messageId: messageId || '',
      userId,
      readAt: lastReadAt,
    });

    return {
      conversationId,
      markedCount,
      lastReadAt,
    };
  }
}
