/**
 * ProviderUserId Value Object
 *
 * Represents a unique identifier for a user in an external provider system.
 * Ensures the ID is valid and properly formatted.
 */
export class ProviderUserId {
  private readonly _value: string;

  constructor(value: string) {
    this.validate(value);
    this._value = value.trim();
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Provider user ID cannot be empty');
    }
    if (value.trim().length > 255) {
      throw new Error(
        'Provider user ID exceeds maximum length of 255 characters',
      );
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: ProviderUserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Factory: Create from string, returns null if invalid
   */
  static tryCreate(value: string): ProviderUserId | null {
    try {
      return new ProviderUserId(value);
    } catch {
      return null;
    }
  }
}
