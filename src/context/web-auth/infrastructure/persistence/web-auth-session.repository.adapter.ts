import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WebAuthSession } from '../../domain/entities/web-auth-session.entity';
import { WebAuthSessionRepository } from '../../domain/ports/out/web-auth-session.repository';
import { web_auth_session as PrismaWebAuthSession } from '@prisma/client';

@Injectable()
export class WebAuthSessionRepositoryAdapter implements WebAuthSessionRepository {
    constructor(private readonly prisma: PrismaService) { }

    private mapToDomain(prismaSession: PrismaWebAuthSession): WebAuthSession {
        return new WebAuthSession(
            prismaSession.id,
            prismaSession.session_token,
            prismaSession.qr_code,
            prismaSession.status,
            prismaSession.user_id,
            prismaSession.ip_address,
            prismaSession.user_agent,
            prismaSession.location,
            prismaSession.expires_at,
            prismaSession.created_at,
            prismaSession.authorized_at,
        );
    }

    async save(session: WebAuthSession): Promise<void> {
        await this.prisma.web_auth_session.create({
            data: {
                id: session.getId(),
                session_token: session.getSessionToken(),
                qr_code: session.getQrCode(),
                status: session.getStatus(),
                user_id: session.getUserId(),
                ip_address: session.getIpAddress(),
                user_agent: session.getUserAgent(),
                location: session.getLocation(),
                expires_at: session.getExpiresAt(),
                created_at: session.getCreatedAt(),
            },
        });
    }

    async findById(id: string): Promise<WebAuthSession | null> {
        const session = await this.prisma.web_auth_session.findUnique({
            where: { id },
        });
        return session ? this.mapToDomain(session) : null;
    }

    async findByQrCode(qrCode: string): Promise<WebAuthSession | null> {
        const session = await this.prisma.web_auth_session.findUnique({
            where: { qr_code: qrCode },
        });
        return session ? this.mapToDomain(session) : null;
    }

    async findBySessionToken(token: string): Promise<WebAuthSession | null> {
        const session = await this.prisma.web_auth_session.findUnique({
            where: { session_token: token },
        });
        return session ? this.mapToDomain(session) : null;
    }

    async update(session: WebAuthSession): Promise<void> {
        await this.prisma.web_auth_session.update({
            where: { id: session.getId() },
            data: {
                status: session.getStatus(),
                user_id: session.getUserId(),
                authorized_at: session.getAuthorizedAt(),
            },
        });
    }
}
