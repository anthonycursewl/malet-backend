import { createHash, randomBytes } from 'crypto';

/** Prefix encoded in the QR so the app can detect the payload type when scanning. */
export const STORE_INVITE_QR_PREFIX = 'malet:store-invite:';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 256-bit random token (base64url, 43 chars) plus its stored hash. */
export function generateInviteToken(): {
  token: string;
  token_hash: string;
} {
  const token = randomBytes(32).toString('base64url');
  return { token, token_hash: sha256(token) };
}

/**
 * Accepts either the raw token or the full QR payload
 * (`malet:store-invite:<token>`). Returns null when the value cannot be a
 * token, so callers can fail fast without hitting the database.
 */
export function normalizeInviteToken(raw: string): string | null {
  const value = (raw ?? '').trim();
  const token = value.includes(':')
    ? value.slice(value.lastIndexOf(':') + 1)
    : value;

  return /^[A-Za-z0-9_-]{32,}$/.test(token) ? token : null;
}
