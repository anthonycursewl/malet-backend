import { UserPublicKey } from '../../entities/user-public-key.entity';

export const MANAGE_KEYS_USECASE = 'MANAGE_KEYS_USECASE';

/**
 * Parámetros para registrar una clave pública
 */
export interface RegisterKeyParams {
  deviceId: string;
  publicKey: string; // PEM format
  keyFingerprint: string; // SHA-256 del public key
}

/**
 * Puerto de entrada para gestionar claves públicas E2E
 */
export interface ManageKeysUseCase {
  /**
   * Registra una nueva clave pública para un dispositivo
   * Si ya existe una clave para ese dispositivo, la reemplaza
   */
  registerKey(
    userId: string,
    params: RegisterKeyParams,
  ): Promise<UserPublicKey>;

  /**
   * Obtiene todas las claves públicas activas del usuario
   */
  getMyKeys(userId: string): Promise<UserPublicKey[]>;

  /**
   * Obtiene las claves públicas activas de otro usuario
   * (Necesario para encriptar mensajes)
   */
  getUserKeys(targetUserId: string): Promise<UserPublicKey[]>;

  /**
   * Obtiene las claves públicas de múltiples usuarios
   * (Útil para conversaciones grupales)
   */
  getUsersKeys(userIds: string[]): Promise<Map<string, UserPublicKey[]>>;

  /**
   * Revoca una clave pública
   */
  revokeKey(userId: string, keyId: string): Promise<void>;

  /**
   * Revoca todas las claves del usuario (logout de todos los dispositivos)
   */
  revokeAllKeys(userId: string): Promise<void>;
}
