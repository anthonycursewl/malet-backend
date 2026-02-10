import { EmailVerificationToken } from '../../entities/email-verification-token.entity';

/**
 * Puerto de repositorio para tokens de verificación de email.
 * Define las operaciones de persistencia para los tokens.
 */
export interface TokenRepository {
  /**
   * Guarda un nuevo token de verificación
   */
  save(token: EmailVerificationToken): Promise<EmailVerificationToken>;

  /**
   * Busca un token por userId y código de token
   */
  findByUserIdAndToken(
    userId: string,
    token: string,
  ): Promise<EmailVerificationToken | null>;

  /**
   * Obtiene el token más reciente de un usuario
   */
  findLatestByUserId(userId: string): Promise<EmailVerificationToken | null>;

  /**
   * Elimina todos los tokens de un usuario
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Elimina tokens expirados (para limpieza periódica)
   */
  deleteExpiredTokens(): Promise<number>;
}

export const TOKEN_REPOSITORY_PORT = 'TOKEN_REPOSITORY_PORT';
