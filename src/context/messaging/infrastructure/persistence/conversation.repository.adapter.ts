import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ConversationRepository } from '../../domain/ports/out/conversation.repository';
import { Conversation } from '../../domain/entities/conversation.entity';
import { ConversationType } from '../../domain/enums/conversation-type.enum';

@Injectable()
export class ConversationRepositoryAdapter implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(conversation: Conversation): Promise<Conversation> {
    const primitives = conversation.toPrimitives();

    const saved = await this.prisma.conversation.create({
      data: {
        id: primitives.id,
        type: primitives.type,
        community_id: primitives.communityId,
        name: primitives.name,
        avatar_url: primitives.avatarUrl,
        created_at: primitives.createdAt,
        updated_at: primitives.updatedAt,
        last_message_at: primitives.lastMessageAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    return conversation ? this.mapToDomain(conversation) : null;
  }

  async findByCommunityId(communityId: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { community_id: communityId },
    });

    return conversation ? this.mapToDomain(conversation) : null;
  }

  async findPrivateBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    // Buscar conversación privada donde ambos usuarios son participantes
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'private',
        participants: {
          every: {
            user_id: { in: [userId1, userId2] },
            is_active: true,
          },
        },
      },
      include: {
        participants: {
          where: { is_active: true },
        },
      },
    });

    // Verificar que tiene exactamente 2 participantes
    if (conversation && conversation.participants.length === 2) {
      const participantIds = conversation.participants.map((p) => p.user_id);
      if (
        participantIds.includes(userId1) &&
        participantIds.includes(userId2)
      ) {
        return this.mapToDomain(conversation);
      }
    }

    return null;
  }

  async findByUserId(
    userId: string,
    type?: ConversationType,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Conversation[]> {
    const whereClause: any = {
      participants: {
        some: {
          user_id: userId,
          is_active: true,
        },
      },
    };

    if (type) {
      whereClause.type = type;
    }

    const conversations = await this.prisma.conversation.findMany({
      where: whereClause,
      orderBy: [{ last_message_at: 'desc' }, { created_at: 'desc' }],
      skip: offset,
      take: limit,
    });

    return conversations.map((c) => this.mapToDomain(c));
  }

  async countByUserId(
    userId: string,
    type?: ConversationType,
  ): Promise<number> {
    const whereClause: any = {
      participants: {
        some: {
          user_id: userId,
          is_active: true,
        },
      },
    };

    if (type) {
      whereClause.type = type;
    }

    return this.prisma.conversation.count({ where: whereClause });
  }

  async updateLastMessageAt(id: string, date: Date): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: {
        last_message_at: date,
        updated_at: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conversation.delete({
      where: { id },
    });
  }

  private mapToDomain(data: any): Conversation {
    return Conversation.fromPrimitives({
      id: data.id,
      type: data.type as ConversationType,
      communityId: data.community_id,
      name: data.name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastMessageAt: data.last_message_at,
    });
  }
}
