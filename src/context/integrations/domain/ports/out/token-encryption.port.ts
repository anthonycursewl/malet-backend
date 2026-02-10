/**
 * Injection token for TokenEncryptionPort
 */
export const TOKEN_ENCRYPTION_PORT = 'TOKEN_ENCRYPTION_PORT';

/**
 * Encrypted data with metadata for decryption
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * TokenEncryption Port (Output/Driven)
 *
 * Defines the contract for encrypting and decrypting OAuth tokens.
 * Tokens should be encrypted at rest for security.
 *
 * This is a "driven" port - the domain uses it to secure sensitive data.
 */
export abstract class TokenEncryptionPort {
  /**
   * Encrypt a token string
   *
   * @param plaintext - The token to encrypt
   * @returns The encrypted token as a base64 string
   */
  abstract encrypt(plaintext: string): string;

  /**
   * Decrypt an encrypted token
   *
   * @param ciphertext - The encrypted token (base64)
   * @returns The decrypted token
   */
  abstract decrypt(ciphertext: string): string;

  /**
   * Encrypt with additional authenticated data
   *
   * @param plaintext - The token to encrypt
   * @param aad - Additional authenticated data
   * @returns Encrypted data with metadata
   */
  abstract encryptWithAAD(plaintext: string, aad: string): EncryptedData;

  /**
   * Decrypt with additional authenticated data verification
   *
   * @param data - The encrypted data with metadata
   * @param aad - Additional authenticated data to verify
   * @returns The decrypted token
   */
  abstract decryptWithAAD(data: EncryptedData, aad: string): string;

  /**
   * Generate a secure random key for testing
   *
   * @returns A 32-byte key as hex string
   */
  abstract generateKey(): string;
}
