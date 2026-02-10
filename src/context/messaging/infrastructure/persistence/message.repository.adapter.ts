import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { MessageRepository } from '../../domain/ports/out/message.repository';
import { Message } from '../../domain/entities/message.entity';
import { MessageType } from '../../domain/enums/message-type.enum';

@Injectable()
export class MessageRepositoryAdapter implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(message: Message): Promise<Message> {
    const primitives = message.toPrimitives();

    const saved = await this.prisma.message.create({
      data: {
        id: primitives.id,
        conversation_id: primitives.conversationId,
        sender_id: primitives.senderId,
        encrypted_content: primitives.encryptedContent,
        encrypted_keys: JSON.stringify(primitives.encryptedKeys),
        content_iv: primitives.contentIv,
        content_tag: primitives.contentTag,
        type: primitives.type,
        reply_to_id: primitives.replyToId,
        created_at: primitives.createdAt,
        updated_at: primitives.updatedAt,
        edited_at: primitives.editedAt,
        deleted_at: primitives.deletedAt,
      },
    });

    return this.mapToDomain(saved);
  }

  async findById(id: string): Promise<Message | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    return message ? this.mapToDomain(message) : null;
  }

  async findByConversationId(
    conversationId: string,
    limit: number,
    before?: Date,
    after?: Date,
  ): Promise<Message[]> {
    const whereClause: any = {
      conversation_id: conversationId,
      deleted_at: null,
    };

    if (before) {
      whereClause.created_at = {
        ...(whereClause.created_at || {}),
        lt: before,
      };
    }

    if (after) {
      whereClause.created_at = { ...(whereClause.created_at || {}), gt: after };
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return messages.map((m) => this.mapToDomain(m));
  }

  async findLastByConversationId(
    conversationId: string,
  ): Promise<Message | null> {
    const message = await this.prisma.message.findFirst({
      where: {
        conversation_id: conversationId,
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    return message ? this.mapToDomain(message) : null;
  }

  async countAfterDate(conversationId: string, date: Date): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversation_id: conversationId,
        created_at: { gt: date },
        deleted_at: null,
      },
    });
  }

  async update(message: Message): Promise<Message> {
    const primitives = message.toPrimitives();

    const updated = await this.prisma.message.update({
      where: { id: primitives.id },
      data: {
        encrypted_content: primitives.encryptedContent,
        encrypted_keys: JSON.stringify(primitives.encryptedKeys),
        content_iv: primitives.contentIv,
        content_tag: primitives.contentTag,
        updated_at: primitives.updatedAt,
        edited_at: primitives.editedAt,
      },
    });

    return this.mapToDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.message.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async findUnreadByUser(
    conversationId: string,
    userId: string,
    lastReadAt: Date,
  ): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        created_at: { gt: lastReadAt },
        sender_id: { not: userId },
        deleted_at: null,
      },
      orderBy: { created_at: 'asc' },
    });

    return messages.map((m) => this.mapToDomain(m));
  }

  private mapToDomain(data: any): Message {
    return Message.fromPrimitives({
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      encryptedContent: data.encrypted_content,
      encryptedKeys:
        typeof data.encrypted_keys === 'string'
          ? JSON.parse(data.encrypted_keys)
          : data.encrypted_keys,
      contentIv: data.content_iv,
      contentTag: data.content_tag,
      type: data.type as MessageType,
      replyToId: data.reply_to_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      editedAt: data.edited_at,
      deletedAt: data.deleted_at,
    });
  }
}
