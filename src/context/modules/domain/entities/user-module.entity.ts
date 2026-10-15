import { randomUUID } from 'crypto';

export interface UserModulePrimitives {
  id: string;
  user_id: string;
  module_key: string;
  enabled: boolean;
  enabled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserModule {
  private readonly id: string;
  private readonly user_id: string;
  private readonly module_key: string;
  private readonly enabled: boolean;
  private readonly enabled_at: Date | null;
  private readonly created_at: Date;
  private readonly updated_at: Date;

  constructor(data: UserModulePrimitives) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.module_key = data.module_key;
    this.enabled = data.enabled;
    this.enabled_at = data.enabled_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static create(data: {
    user_id: string;
    module_key: string;
    enabled: boolean;
  }): UserModule {
    const now = new Date();
    return new UserModule({
      id: randomUUID(),
      user_id: data.user_id,
      module_key: data.module_key,
      enabled: data.enabled,
      enabled_at: data.enabled ? now : null,
      created_at: now,
      updated_at: now,
    });
  }

  static fromPrimitives(primitives: UserModulePrimitives): UserModule {
    return new UserModule({
      id: primitives.id,
      user_id: primitives.user_id,
      module_key: primitives.module_key,
      enabled: primitives.enabled,
      enabled_at: primitives.enabled_at ?? null,
      created_at: primitives.created_at,
      updated_at: primitives.updated_at,
    });
  }

  toPrimitives(): UserModulePrimitives {
    return {
      id: this.id,
      user_id: this.user_id,
      module_key: this.module_key,
      enabled: this.enabled,
      enabled_at: this.enabled_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.user_id;
  }

  getModuleKey(): string {
    return this.module_key;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getEnabledAt(): Date | null {
    return this.enabled_at;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getUpdatedAt(): Date {
    return this.updated_at;
  }

  enable(): UserModule {
    return new UserModule({
      ...this.toPrimitives(),
      enabled: true,
      enabled_at: this.enabled ? this.enabled_at : new Date(),
      updated_at: new Date(),
    });
  }

  disable(): UserModule {
    return new UserModule({
      ...this.toPrimitives(),
      enabled: false,
      enabled_at: null,
      updated_at: new Date(),
    });
  }
}
