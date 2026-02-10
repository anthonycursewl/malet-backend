/**
 * Provisioning Status Enum
 *
 * Represents the possible outcomes of a user provisioning attempt.
 */
export enum ProvisioningStatus {
  /** User was successfully created in the external system */
  CREATED = 'created',
  /** User already existed in the external system */
  EXISTING = 'existing',
  /** User was created but needs to verify their email */
  PENDING_VERIFICATION = 'pending_verification',
  /** User provisioning failed */
  FAILED = 'failed',
}

/**
 * Required Action Type
 *
 * Defines the type of action the user needs to take.
 */
export type RequiredActionType =
  | 'email_verification'
  | 'manual_registration'
  | 'admin_approval'
  | 'phone_verification';

/**
 * Required Action
 *
 * Details about an action the user needs to take to complete provisioning.
 */
export interface RequiredAction {
  type: RequiredActionType;
  url?: string;
  instructions?: string;
  expiresAt?: Date;
}

/**
 * ProvisioningResult Entity
 *
 * Represents the result of attempting to provision a user in an external system.
 * Immutable value object that encapsulates the outcome and any required actions.
 */
export class ProvisioningResult {
  constructor(
    public readonly status: ProvisioningStatus,
    public readonly providerUserId: string | null,
    public readonly message: string,
    public readonly provider: string,
    public readonly requiresAction?: RequiredAction,
    public readonly metadata?: Record<string, unknown>,
  ) {}

  /**
   * Check if the provisioning was successful (created or already exists)
   */
  get isSuccess(): boolean {
    return (
      this.status === ProvisioningStatus.CREATED ||
      this.status === ProvisioningStatus.EXISTING
    );
  }

  /**
   * Check if the user needs to take an action
   */
  get needsUserAction(): boolean {
    return !!this.requiresAction;
  }

  /**
   * Check if this is a new user creation
   */
  get isNewUser(): boolean {
    return this.status === ProvisioningStatus.CREATED;
  }

  /**
   * Check if email verification is pending
   */
  get isPendingVerification(): boolean {
    return this.status === ProvisioningStatus.PENDING_VERIFICATION;
  }

  /**
   * Factory: Create a success result for a new user
   */
  static created(
    provider: string,
    providerUserId: string,
    message = 'User provisioned successfully',
  ): ProvisioningResult {
    return new ProvisioningResult(
      ProvisioningStatus.CREATED,
      providerUserId,
      message,
      provider,
    );
  }

  /**
   * Factory: Create a result for an existing user
   */
  static existing(
    provider: string,
    providerUserId: string,
    message = 'User already exists',
  ): ProvisioningResult {
    return new ProvisioningResult(
      ProvisioningStatus.EXISTING,
      providerUserId,
      message,
      provider,
    );
  }

  /**
   * Factory: Create a result requiring email verification
   */
  static pendingVerification(
    provider: string,
    providerUserId: string,
    instructions: string,
  ): ProvisioningResult {
    return new ProvisioningResult(
      ProvisioningStatus.PENDING_VERIFICATION,
      providerUserId,
      'Email verification required',
      provider,
      {
        type: 'email_verification',
        instructions,
      },
    );
  }

  /**
   * Factory: Create a failed result with manual registration fallback
   */
  static failedWithManualFallback(
    provider: string,
    message: string,
    registrationUrl: string,
  ): ProvisioningResult {
    return new ProvisioningResult(
      ProvisioningStatus.FAILED,
      null,
      message,
      provider,
      {
        type: 'manual_registration',
        url: registrationUrl,
        instructions: 'Please create your account manually',
      },
    );
  }

  /**
   * Factory: Create a generic failed result
   */
  static failed(provider: string, message: string): ProvisioningResult {
    return new ProvisioningResult(
      ProvisioningStatus.FAILED,
      null,
      message,
      provider,
    );
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      status: this.status,
      providerUserId: this.providerUserId,
      message: this.message,
      provider: this.provider,
      isSuccess: this.isSuccess,
      needsUserAction: this.needsUserAction,
      requiresAction: this.requiresAction,
      metadata: this.metadata,
    };
  }
}
