import { UserPublicKey } from '../../entities/user-public-key.entity';

export const USER_KEY_REPOSITORY_PORT = 'USER_KEY_REPOSITORY_PORT';

/**
 * Puerto de salida para el repositorio de claves públicas
 */
export interface UserKeyRepository {
  /**
   * Guarda una clave pública
   */
  save(key: UserPublicKey): Promise<UserPublicKey>;

  /**
   * Busca una clave por ID
   */
  findById(id: string): Promise<UserPublicKey | null>;

  /**
   * Busca una clave por usuario y dispositivo
   */
  findByUserAndDevice(
    userId: string,
    deviceId: string,
  ): Promise<UserPublicKey | null>;

  /**
   * Obtiene todas las claves activas de un usuario
   */
  findActiveByUserId(userId: string): Promise<UserPublicKey[]>;

  /**
   * Obtiene claves activas de múltiples usuarios
   */
  findActiveByUserIds(userIds: string[]): Promise<Map<string, UserPublicKey[]>>;

  /**
   * Busca una clave por fingerprint
   */
  findByFingerprint(fingerprint: string): Promise<UserPublicKey | null>;

  /**
   * Actualiza una clave (para reemplazo)
   */
  update(key: UserPublicKey): Promise<UserPublicKey>;

  /**
   * Revoca una clave
   */
  revoke(id: string): Promise<void>;

  /**
   * Revoca todas las claves de un usuario
   */
  revokeAllByUserId(userId: string): Promise<void>;
}
