import { User } from './user.entity';

describe('User verification invariants', () => {
  it('Google login verifies email but does not grant the badge', () => {
    const user = User.createFromGoogle({
      email: 'user@example.com',
      name: 'Google User',
      googleId: 'google-1',
    });

    expect(user.isEmailVerified()).toBe(true);
    expect(user.isVerified()).toBe(false);
    expect(user.getVerificationType()).toBeNull();
  });

  it('does not expose a badge without verification type', () => {
    const user = User.fromPrimitives({
      id: 'user-1',
      name: 'User',
      username: 'user',
      email: 'user@example.com',
      created_at: new Date(),
      password: 'hashed',
      verified: true,
      verification_type_id: null,
      verification_type: null,
      email_verified: true,
    });

    const safe = user.toSafePrimitives();

    expect(safe).not.toHaveProperty('password');
    expect(safe.verified).toBe(false);
    expect(safe.verification_type).toBeNull();
  });

  it('returns the verification type only for a verified account', () => {
    const type = {
      id: 'type-1',
      type: 'malet-main-verification',
      icon_url: 'https://example.com/icon.png',
    };
    const user = User.fromPrimitives({
      id: 'user-1',
      name: 'User',
      username: 'user',
      email: 'user@example.com',
      created_at: new Date(),
      password: 'hashed',
      verified: true,
      verification_type_id: type.id,
      verification_type: type,
      email_verified: true,
    });

    const safe = user.toSafePrimitives();

    expect(safe.verified).toBe(true);
    expect(safe.verification_type).toEqual(type);
    expect(safe.verification_type_id).toBe(type.id);
  });
});
