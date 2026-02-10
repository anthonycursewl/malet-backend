/**
 * ProvisioningData Value Object
 *
 * Contains the data required to provision a user in an external system.
 * Validates all required fields and provides a clean interface for provisioning adapters.
 */
export interface ProvisioningMetadata {
  phone?: string;
  timezone?: string;
  locale?: string;
  [key: string]: unknown;
}

export class ProvisioningData {
  private readonly _email: string;
  private readonly _name: string;
  private readonly _maletUserId: string;
  private readonly _source: 'malet';
  private readonly _metadata: ProvisioningMetadata | null;

  constructor(
    email: string,
    name: string,
    maletUserId: string,
    metadata?: ProvisioningMetadata,
  ) {
    this._email = email.trim().toLowerCase();
    this._name = name.trim();
    this._maletUserId = maletUserId;
    this._source = 'malet';
    this._metadata = metadata ?? null;

    this.validate();
  }

  private validate(): void {
    // Email validation
    if (!this._email || !this._email.includes('@')) {
      throw new Error('Invalid email for provisioning');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this._email)) {
      throw new Error('Invalid email format for provisioning');
    }

    // Name validation
    if (!this._name || this._name.length < 2) {
      throw new Error('Name must be at least 2 characters for provisioning');
    }
    if (this._name.length > 100) {
      throw new Error('Name cannot exceed 100 characters');
    }

    // Malet user ID validation
    if (!this._maletUserId || this._maletUserId.trim().length === 0) {
      throw new Error('Malet user ID is required for provisioning');
    }

    // Phone validation (optional)
    if (this._metadata?.phone) {
      const phoneRegex = /^\+?[\d\s-()]{7,20}$/;
      if (!phoneRegex.test(this._metadata.phone)) {
        throw new Error('Invalid phone number format');
      }
    }
  }

  get email(): string {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  get maletUserId(): string {
    return this._maletUserId;
  }

  get source(): 'malet' {
    return this._source;
  }

  get metadata(): ProvisioningMetadata | null {
    return this._metadata ? { ...this._metadata } : null;
  }

  get phone(): string | undefined {
    return this._metadata?.phone;
  }

  get timezone(): string | undefined {
    return this._metadata?.timezone;
  }

  get locale(): string | undefined {
    return this._metadata?.locale;
  }

  /**
   * Get first name (first word of name)
   */
  get firstName(): string {
    return this._name.split(' ')[0];
  }

  /**
   * Get last name (everything after first word)
   */
  get lastName(): string {
    const parts = this._name.split(' ');
    return parts.slice(1).join(' ') || '';
  }

  /**
   * Convert to JSON for API requests to external providers
   */
  toJSON(): Record<string, unknown> {
    return {
      email: this._email,
      name: this._name,
      first_name: this.firstName,
      last_name: this.lastName,
      external_id: this._maletUserId,
      source: this._source,
      ...(this._metadata && {
        phone: this._metadata.phone,
        timezone: this._metadata.timezone,
        locale: this._metadata.locale,
      }),
    };
  }

  /**
   * Convert to provider-specific format (can be overridden by adapters)
   */
  toProviderFormat(provider: string): Record<string, unknown> {
    const base = this.toJSON();

    // Add provider-specific transformations here
    switch (provider) {
      case 'wheek':
        return {
          ...base,
          external_partner_id: this._maletUserId,
          source: 'malet_integration',
        };
      default:
        return base;
    }
  }

  /**
   * Factory: Create from user object
   */
  static fromUser(user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    timezone?: string;
    locale?: string;
  }): ProvisioningData {
    return new ProvisioningData(user.email, user.name, user.id, {
      phone: user.phone,
      timezone: user.timezone,
      locale: user.locale,
    });
  }
}
