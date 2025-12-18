import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { TokenRepository } from "../../domain/ports/out/token.repository";
import {
    EmailVerificationToken,
    EmailVerificationTokenPrimitives
} from "../../domain/entities/email-verification-token.entity";

/**
 * Adaptador de Prisma para el repositorio de tokens de verificación.
 */
@Injectable()
export class TokenRepositoryAdapter implements TokenRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(token: EmailVerificationToken): Promise<EmailVerificationToken> {
        const primitives = token.toPrimitives();

        const saved = await this.prisma.email_verification_token.create({
            data: {
                id: primitives.id,
                user_id: primitives.userId,
                token: primitives.token,
                expires_at: primitives.expiresAt,
                created_at: primitives.createdAt
            }
        });

        return this.toDomain(saved);
    }

    async findByUserIdAndToken(userId: string, token: string): Promise<EmailVerificationToken | null> {
        const found = await this.prisma.email_verification_token.findFirst({
            where: {
                user_id: userId,
                token
            }
        });

        return found ? this.toDomain(found) : null;
    }

    async findLatestByUserId(userId: string): Promise<EmailVerificationToken | null> {
        const found = await this.prisma.email_verification_token.findFirst({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });

        return found ? this.toDomain(found) : null;
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.prisma.email_verification_token.deleteMany({
            where: { user_id: userId }
        });
    }

    async deleteExpiredTokens(): Promise<number> {
        const result = await this.prisma.email_verification_token.deleteMany({
            where: {
                expires_at: {
                    lt: new Date()
                }
            }
        });

        return result.count;
    }

    /**
     * Convierte un registro de Prisma a entidad de dominio
     */
    private toDomain(record: {
        id: string;
        user_id: string;
        token: string;
        expires_at: Date;
        created_at: Date;
    }): EmailVerificationToken {
        return EmailVerificationToken.fromPrimitives({
            id: record.id,
            userId: record.user_id,
            token: record.token,
            expiresAt: record.expires_at,
            createdAt: record.created_at
        });
    }
}
