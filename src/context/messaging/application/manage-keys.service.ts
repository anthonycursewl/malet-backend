import { Injectable, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
    ManageKeysUseCase,
    RegisterKeyParams
} from '../domain/ports/in/manage-keys.usecase';
import {
    USER_KEY_REPOSITORY_PORT,
    UserKeyRepository
} from '../domain/ports/out/user-key.repository';
import { UserPublicKey } from '../domain/entities/user-public-key.entity';

@Injectable()
export class ManageKeysService implements ManageKeysUseCase {
    constructor(
        @Inject(USER_KEY_REPOSITORY_PORT)
        private readonly keyRepository: UserKeyRepository
    ) { }

    async registerKey(userId: string, params: RegisterKeyParams): Promise<UserPublicKey> {
        const { deviceId, publicKey, keyFingerprint } = params;

        // Validar formato PEM básico
        if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
            throw new BadRequestException('Formato de clave pública inválido');
        }

        // Verificar si ya existe una clave para este dispositivo
        const existingKey = await this.keyRepository.findByUserAndDevice(userId, deviceId);

        if (existingKey) {
            // Si es el mismo fingerprint, no hacer nada
            if (existingKey.getKeyFingerprint() === keyFingerprint) {
                return existingKey;
            }

            // Revocar la clave anterior
            await this.keyRepository.revoke(existingKey.getId());
        }

        // Verificar que el fingerprint no esté en uso por otro usuario
        const keyByFingerprint = await this.keyRepository.findByFingerprint(keyFingerprint);
        if (keyByFingerprint && keyByFingerprint.getUserId() !== userId) {
            throw new BadRequestException('Esta clave ya está registrada por otro usuario');
        }

        // Crear nueva clave
        const newKey = UserPublicKey.create(userId, deviceId, publicKey, keyFingerprint);
        return this.keyRepository.save(newKey);
    }

    async getMyKeys(userId: string): Promise<UserPublicKey[]> {
        return this.keyRepository.findActiveByUserId(userId);
    }

    async getUserKeys(targetUserId: string): Promise<UserPublicKey[]> {
        return this.keyRepository.findActiveByUserId(targetUserId);
    }

    async getUsersKeys(userIds: string[]): Promise<Map<string, UserPublicKey[]>> {
        return this.keyRepository.findActiveByUserIds(userIds);
    }

    async revokeKey(userId: string, keyId: string): Promise<void> {
        const key = await this.keyRepository.findById(keyId);

        if (!key) {
            throw new BadRequestException('La clave no existe');
        }

        if (key.getUserId() !== userId) {
            throw new ForbiddenException('No tienes permiso para revocar esta clave');
        }

        await this.keyRepository.revoke(keyId);
    }

    async revokeAllKeys(userId: string): Promise<void> {
        await this.keyRepository.revokeAllByUserId(userId);
    }
}
