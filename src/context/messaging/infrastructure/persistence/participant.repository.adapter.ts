import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ParticipantRepository } from '../../domain/ports/out/participant.repository';
import { ConversationParticipant } from '../../domain/entities/participant.entity';
import { ParticipantRole } from '../../domain/enums/participant-role.enum';

@Injectable()
export class ParticipantRepositoryAdapter implements ParticipantRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(participant: ConversationParticipant): Promise<ConversationParticipant> {
        const primitives = participant.toPrimitives();

        const saved = await this.prisma.conversation_participant.create({
            data: {
                id: primitives.id,
                conversation_id: primitives.conversationId,
                user_id: primitives.userId,
                role: primitives.role,
                joined_at: primitives.joinedAt,
                last_read_at: primitives.lastReadAt,
                muted: primitives.muted,
                is_active: primitives.isActive
            }
        });

        return this.mapToDomain(saved);
    }

    async saveMany(participants: ConversationParticipant[]): Promise<ConversationParticipant[]> {
        const results: ConversationParticipant[] = [];

        for (const participant of participants) {
            const saved = await this.save(participant);
            results.push(saved);
        }

        return results;
    }

    async findById(id: string): Promise<ConversationParticipant | null> {
        const participant = await this.prisma.conversation_participant.findUnique({
            where: { id }
        });

        return participant ? this.mapToDomain(participant) : null;
    }

    async findByConversationAndUser(
        conversationId: string,
        userId: string
    ): Promise<ConversationParticipant | null> {
        const participant = await this.prisma.conversation_participant.findUnique({
            where: {
                conversation_id_user_id: {
                    conversation_id: conversationId,
                    user_id: userId
                }
            }
        });

        return participant ? this.mapToDomain(participant) : null;
    }

    async findByConversationId(
        conversationId: string,
        activeOnly: boolean = true
    ): Promise<ConversationParticipant[]> {
        const whereClause: any = { conversation_id: conversationId };
        if (activeOnly) {
            whereClause.is_active = true;
        }

        const participants = await this.prisma.conversation_participant.findMany({
            where: whereClause,
            orderBy: { joined_at: 'asc' }
        });

        return participants.map(p => this.mapToDomain(p));
    }

    async findByUserId(
        userId: string,
        activeOnly: boolean = true
    ): Promise<ConversationParticipant[]> {
        const whereClause: any = { user_id: userId };
        if (activeOnly) {
            whereClause.is_active = true;
        }

        const participants = await this.prisma.conversation_participant.findMany({
            where: whereClause,
            orderBy: { joined_at: 'desc' }
        });

        return participants.map(p => this.mapToDomain(p));
    }

    async updateLastReadAt(id: string, date: Date): Promise<void> {
        await this.prisma.conversation_participant.update({
            where: { id },
            data: { last_read_at: date }
        });
    }

    async updateRole(id: string, role: ParticipantRole): Promise<void> {
        await this.prisma.conversation_participant.update({
            where: { id },
            data: { role }
        });
    }

    async updateMuted(id: string, muted: boolean): Promise<void> {
        await this.prisma.conversation_participant.update({
            where: { id },
            data: { muted }
        });
    }

    async markAsInactive(id: string): Promise<void> {
        await this.prisma.conversation_participant.update({
            where: { id },
            data: { is_active: false }
        });
    }

    async countUnreadMessages(conversationId: string, userId: string): Promise<number> {
        const participant = await this.findByConversationAndUser(conversationId, userId);

        if (!participant) return 0;

        const lastReadAt = participant.getLastReadAt() || new Date(0);

        return this.prisma.message.count({
            where: {
                conversation_id: conversationId,
                created_at: { gt: lastReadAt },
                sender_id: { not: userId },
                deleted_at: null
            }
        });
    }

    private mapToDomain(data: any): ConversationParticipant {
        return ConversationParticipant.fromPrimitives({
            id: data.id,
            conversationId: data.conversation_id,
            userId: data.user_id,
            role: data.role as ParticipantRole,
            joinedAt: data.joined_at,
            lastReadAt: data.last_read_at,
            muted: data.muted,
            isActive: data.is_active
        });
    }
}
