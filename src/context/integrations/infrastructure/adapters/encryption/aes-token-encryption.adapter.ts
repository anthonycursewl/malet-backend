import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { TokenEncryptionPort, EncryptedData } from '../../../domain';

/**
 * AES-256-GCM Token Encryption Adapter
 *
 * Implements TokenEncryptionPort using AES-256-GCM for secure token storage.
 * GCM provides authenticated encryption (confidentiality + integrity).
 */
@Injectable()
export class AESTokenEncryptionAdapter extends TokenEncryptionPort {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyBuffer: Buffer;

  constructor(private readonly configService: ConfigService) {
    super();

    const keyHex = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');

    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }

    this.keyBuffer = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt a token string
   * Format: iv:tag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv(this.algorithm, this.keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    // Combine: iv:tag:ciphertext
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted token
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivB64, tagB64, encryptedB64] = parts;

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    const decipher = createDecipheriv(this.algorithm, this.keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt with additional authenticated data
   */
  encryptWithAAD(plaintext: string, aad: string): EncryptedData {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.keyBuffer, iv);

    cipher.setAAD(Buffer.from(aad, 'utf8'));

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt with AAD verification
   */
  decryptWithAAD(data: EncryptedData, aad: string): string {
    const iv = Buffer.from(data.iv, 'base64');
    const tag = Buffer.from(data.tag, 'base64');

    const decipher = createDecipheriv(this.algorithm, this.keyBuffer, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(aad, 'utf8'));

    let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a secure random key for testing/setup
   */
  generateKey(): string {
    return randomBytes(32).toString('hex');
  }
}
