/**
 * Primitivas de la entidad UserPublicKey
 */
export interface UserPublicKeyPrimitives {
    id: string;
    userId: string;
    deviceId: string;
    publicKey: string; // PEM format
    keyFingerprint: string; // SHA-256 hash del public key
    isActive: boolean;
    createdAt: Date;
    revokedAt: Date | null;
}

/**
 * Entidad de dominio UserPublicKey
 * Representa una clave pública de un usuario para encriptación E2E
 * 
 * Cada usuario puede tener múltiples claves públicas (una por dispositivo).
 * Las claves privadas NUNCA se almacenan en el servidor.
 */
export class UserPublicKey {
    private readonly id: string;
    private readonly userId: string;
    private readonly deviceId: string;
    private readonly publicKey: string;
    private readonly keyFingerprint: string;
    private readonly isActive: boolean;
    private readonly createdAt: Date;
    private readonly revokedAt: Date | null;

    private constructor(params: UserPublicKeyPrimitives) {
        this.id = params.id;
        this.userId = params.userId;
        this.deviceId = params.deviceId;
        this.publicKey = params.publicKey;
        this.keyFingerprint = params.keyFingerprint;
        this.isActive = params.isActive;
        this.createdAt = params.createdAt;
        this.revokedAt = params.revokedAt;
    }

    /**
     * Crea una nueva clave pública
     */
    static create(
        userId: string,
        deviceId: string,
        publicKey: string,
        keyFingerprint: string
    ): UserPublicKey {
        return new UserPublicKey({
            id: crypto.randomUUID(),
            userId,
            deviceId,
            publicKey,
            keyFingerprint,
            isActive: true,
            createdAt: new Date(),
            revokedAt: null
        });
    }

    // Getters
    getId(): string { return this.id; }
    getUserId(): string { return this.userId; }
    getDeviceId(): string { return this.deviceId; }
    getPublicKey(): string { return this.publicKey; }
    getKeyFingerprint(): string { return this.keyFingerprint; }
    getIsActive(): boolean { return this.isActive; }
    getCreatedAt(): Date { return this.createdAt; }
    getRevokedAt(): Date | null { return this.revokedAt; }

    /**
     * Verifica si la clave está activa y no revocada
     */
    isValid(): boolean {
        return this.isActive && this.revokedAt === null;
    }

    /**
     * Crea una versión revocada de la clave
     */
    asRevoked(): UserPublicKey {
        return new UserPublicKey({
            ...this.toPrimitives(),
            isActive: false,
            revokedAt: new Date()
        });
    }

    toPrimitives(): UserPublicKeyPrimitives {
        return {
            id: this.id,
            userId: this.userId,
            deviceId: this.deviceId,
            publicKey: this.publicKey,
            keyFingerprint: this.keyFingerprint,
            isActive: this.isActive,
            createdAt: this.createdAt,
            revokedAt: this.revokedAt
        };
    }

    static fromPrimitives(primitives: UserPublicKeyPrimitives): UserPublicKey {
        return new UserPublicKey(primitives);
    }
}
