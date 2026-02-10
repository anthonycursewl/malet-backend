import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateConversationUseCase,
  CreatePrivateConversationParams,
  CreateCommunityConversationParams,
  CreateConversationResult,
} from '../domain/ports/in/create-conversation.usecase';
import {
  CONVERSATION_REPOSITORY_PORT,
  ConversationRepository,
} from '../domain/ports/out/conversation.repository';
import {
  PARTICIPANT_REPOSITORY_PORT,
  ParticipantRepository,
} from '../domain/ports/out/participant.repository';
import { Conversation } from '../domain/entities/conversation.entity';
import { ConversationParticipant } from '../domain/entities/participant.entity';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CreateConversationService implements CreateConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY_PORT)
    private readonly conversationRepository: ConversationRepository,
    @Inject(PARTICIPANT_REPOSITORY_PORT)
    private readonly participantRepository: ParticipantRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createPrivate(
    userId: string,
    params: CreatePrivateConversationParams,
  ): Promise<CreateConversationResult> {
    const { participantUserId } = params;

    // No puedes crear una conversación contigo mismo
    if (userId === participantUserId) {
      throw new BadRequestException(
        'No puedes crear una conversación contigo mismo',
      );
    }

    // Verificar que el otro usuario existe
    const targetUser = await this.prisma.user.findUnique({
      where: { id: participantUserId },
    });

    if (!targetUser) {
      throw new BadRequestException('El usuario no existe');
    }

    // Verificar si ya existe una conversación entre estos usuarios
    const existingConversation =
      await this.conversationRepository.findPrivateBetweenUsers(
        userId,
        participantUserId,
      );

    if (existingConversation) {
      const participants =
        await this.participantRepository.findByConversationId(
          existingConversation.getId(),
        );
      return {
        conversation: existingConversation,
        participants,
        isNew: false,
      };
    }

    // Crear nueva conversación privada
    const conversation = Conversation.createPrivate();
    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Crear participantes
    const participant1 = ConversationParticipant.createAsAdmin(
      savedConversation.getId(),
      userId,
    );
    const participant2 = ConversationParticipant.create(
      savedConversation.getId(),
      participantUserId,
    );

    const participants = await this.participantRepository.saveMany([
      participant1,
      participant2,
    ]);

    return {
      conversation: savedConversation,
      participants,
      isNew: true,
    };
  }

  async createForCommunity(
    userId: string,
    params: CreateCommunityConversationParams,
  ): Promise<CreateConversationResult> {
    const { communityId, name, avatarUrl } = params;

    // Verificar que la comunidad existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new BadRequestException('La comunidad no existe');
    }

    // Solo el owner puede crear el chat de la comunidad
    if (community.owner_id !== userId) {
      throw new ForbiddenException(
        'Solo el owner puede crear el chat de la comunidad',
      );
    }

    // Verificar si ya existe un chat para esta comunidad
    const existingConversation =
      await this.conversationRepository.findByCommunityId(communityId);

    if (existingConversation) {
      const participants =
        await this.participantRepository.findByConversationId(
          existingConversation.getId(),
        );
      return {
        conversation: existingConversation,
        participants,
        isNew: false,
      };
    }

    // Crear conversación para la comunidad
    const conversation = Conversation.createForCommunity(
      communityId,
      name || community.name,
      avatarUrl || community.avatar_url || undefined,
    );
    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Crear participante para el owner como admin
    const ownerParticipant = ConversationParticipant.createAsAdmin(
      savedConversation.getId(),
      userId,
    );

    // Obtener todos los miembros de la comunidad y agregarlos como participantes
    const members = await this.prisma.community_member.findMany({
      where: {
        community_id: communityId,
        user_id: { not: userId }, // Excluir al owner ya agregado
      },
    });

    const memberParticipants = members.map((m) =>
      ConversationParticipant.create(savedConversation.getId(), m.user_id),
    );

    const allParticipants = [ownerParticipant, ...memberParticipants];
    const participants =
      await this.participantRepository.saveMany(allParticipants);

    return {
      conversation: savedConversation,
      participants,
      isNew: true,
    };
  }
}
