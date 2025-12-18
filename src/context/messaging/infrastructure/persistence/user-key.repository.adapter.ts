import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserKeyRepository } from '../../domain/ports/out/user-key.repository';
import { UserPublicKey } from '../../domain/entities/user-public-key.entity';

@Injectable()
export class UserKeyRepositoryAdapter implements UserKeyRepository {
    constructor(private readonly prisma: PrismaService) { }

    async save(key: UserPublicKey): Promise<UserPublicKey> {
        const primitives = key.toPrimitives();

        const saved = await this.prisma.user_public_key.create({
            data: {
                id: primitives.id,
                user_id: primitives.userId,
                device_id: primitives.deviceId,
                public_key: primitives.publicKey,
                key_fingerprint: primitives.keyFingerprint,
                is_active: primitives.isActive,
                created_at: primitives.createdAt,
                revoked_at: primitives.revokedAt
            }
        });

        return this.mapToDomain(saved);
    }

    async findById(id: string): Promise<UserPublicKey | null> {
        const key = await this.prisma.user_public_key.findUnique({
            where: { id }
        });

        return key ? this.mapToDomain(key) : null;
    }

    async findByUserAndDevice(userId: string, deviceId: string): Promise<UserPublicKey | null> {
        const key = await this.prisma.user_public_key.findUnique({
            where: {
                user_id_device_id: {
                    user_id: userId,
                    device_id: deviceId
                }
            }
        });

        return key ? this.mapToDomain(key) : null;
    }

    async findActiveByUserId(userId: string): Promise<UserPublicKey[]> {
        const keys = await this.prisma.user_public_key.findMany({
            where: {
                user_id: userId,
                is_active: true,
                revoked_at: null
            },
            orderBy: { created_at: 'desc' }
        });

        return keys.map(k => this.mapToDomain(k));
    }

    async findActiveByUserIds(userIds: string[]): Promise<Map<string, UserPublicKey[]>> {
        const keys = await this.prisma.user_public_key.findMany({
            where: {
                user_id: { in: userIds },
                is_active: true,
                revoked_at: null
            },
            orderBy: { created_at: 'desc' }
        });

        const result = new Map<string, UserPublicKey[]>();

        for (const userId of userIds) {
            result.set(userId, []);
        }

        for (const key of keys) {
            const userKeys = result.get(key.user_id) || [];
            userKeys.push(this.mapToDomain(key));
            result.set(key.user_id, userKeys);
        }

        return result;
    }

    async findByFingerprint(fingerprint: string): Promise<UserPublicKey | null> {
        const key = await this.prisma.user_public_key.findFirst({
            where: {
                key_fingerprint: fingerprint,
                is_active: true
            }
        });

        return key ? this.mapToDomain(key) : null;
    }

    async update(key: UserPublicKey): Promise<UserPublicKey> {
        const primitives = key.toPrimitives();

        const updated = await this.prisma.user_public_key.update({
            where: { id: primitives.id },
            data: {
                public_key: primitives.publicKey,
                key_fingerprint: primitives.keyFingerprint,
                is_active: primitives.isActive,
                revoked_at: primitives.revokedAt
            }
        });

        return this.mapToDomain(updated);
    }

    async revoke(id: string): Promise<void> {
        await this.prisma.user_public_key.update({
            where: { id },
            data: {
                is_active: false,
                revoked_at: new Date()
            }
        });
    }

    async revokeAllByUserId(userId: string): Promise<void> {
        await this.prisma.user_public_key.updateMany({
            where: {
                user_id: userId,
                is_active: true
            },
            data: {
                is_active: false,
                revoked_at: new Date()
            }
        });
    }

    private mapToDomain(data: any): UserPublicKey {
        return UserPublicKey.fromPrimitives({
            id: data.id,
            userId: data.user_id,
            deviceId: data.device_id,
            publicKey: data.public_key,
            keyFingerprint: data.key_fingerprint,
            isActive: data.is_active,
            createdAt: data.created_at,
            revokedAt: data.revoked_at
        });
    }
}
