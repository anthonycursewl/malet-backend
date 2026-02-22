import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface VerificationTypePrimitive {
  id: string;
  type: string;
  icon_url: string;
}

export interface UserPrimitives {
  id: string;
  name: string;
  username: string;
  email: string;
  created_at: Date;
  password?: string;
  google_id?: string;

  avatar_url?: string;
  banner_url?: string;
  verified: boolean;
  verification_type_id?: string | null;
  verification_type?: VerificationTypePrimitive | null;
  email_verified?: boolean;
  email_verified_at?: Date | null;
}

export class User {
  private readonly id: string;
  private readonly name: string;
  private readonly username: string;
  private readonly email: string;
  private readonly created_at: Date;
  private readonly password?: string;
  private readonly google_id?: string;

  private readonly avatar_url?: string;
  private readonly banner_url?: string;
  private readonly verified: boolean;
  private readonly verification_type_id?: string | null;
  private readonly verification_type?: VerificationTypePrimitive | null;
  private readonly email_verified: boolean;
  private readonly email_verified_at?: Date | null;

  constructor(params: {
    id: string;
    name: string;
    username: string;
    email: string;
    created_at: Date;
    password?: string;
    google_id?: string;

    avatar_url?: string;
    banner_url?: string;
    verified: boolean;
    verification_type_id?: string | null;
    verification_type?: VerificationTypePrimitive | null;
    email_verified?: boolean;
    email_verified_at?: Date | null;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.username = params.username;
    this.email = params.email;
    this.created_at = params.created_at;
    this.password = params.password;
    this.google_id = params.google_id;

    this.avatar_url = params.avatar_url;
    this.banner_url = params.banner_url;
    this.verified = params.verified;
    this.verification_type_id = params.verification_type_id;
    this.verification_type = params.verification_type;
    this.email_verified = params.email_verified ?? false;
    this.email_verified_at = params.email_verified_at;
  }

  static async create(
    user: Omit<
      UserPrimitives,
      | 'id'
      | 'created_at'
      | 'verified'
      | 'verification_type_id'
      | 'verification_type'
      | 'email_verified'
      | 'email_verified_at'
    > & { password: string },
  ): Promise<User> {

    const hashedPassword = await this.hashPassword(user.password);

    return new User({
      id: crypto.randomUUID().split('-')[4],
      name: user.name,
      username: user.username,
      email: user.email,
      created_at: new Date(),
      password: hashedPassword,
      avatar_url: user.avatar_url,
      banner_url: user.banner_url,
      verified: false,
      verification_type_id: null,
      verification_type: null,
      email_verified: false,
      email_verified_at: null,
    });
  }

  static createFromGoogle(data: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
  }): User {
    return new User({
      id: crypto.randomUUID().split('-')[4],
      name: data.name,
      username: data.email.split('@')[0], // Generate username from email
      email: data.email,
      created_at: new Date(),
      google_id: data.googleId,
      avatar_url: data.avatarUrl,
      verified: true, // Google emails are verified
      email_verified: true,
      email_verified_at: new Date(),
    });
  }


  toPrimitives(): UserPrimitives {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      email: this.email,
      created_at: this.created_at,
      password: this.password,
      google_id: this.google_id,

      avatar_url: this.avatar_url,
      banner_url: this.banner_url,
      verified: this.verified,
      verification_type_id: this.verification_type_id,
      verification_type: this.verification_type,
      email_verified: this.email_verified,
      email_verified_at: this.email_verified_at,
    };
  }

  static fromPrimitives(primitives: UserPrimitives): User {
    return new User(primitives);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getUsername(): string {
    return this.username;
  }

  getEmail(): string {
    return this.email;
  }

  getCreatedAt(): Date {
    return this.created_at;
  }

  getPassword(): string | undefined {
    return this.password;
  }

  getGoogleId(): string | undefined {
    return this.google_id;
  }


  getAvatarUrl(): string | undefined {
    return this.avatar_url;
  }

  getBannerUrl(): string | undefined {
    return this.banner_url;
  }

  isVerified(): boolean {
    return this.verified;
  }

  getVerificationTypeId(): string | null | undefined {
    return this.verification_type_id;
  }

  getVerificationType(): VerificationTypePrimitive | null | undefined {
    return this.verification_type;
  }

  /**
   * Verifica si el email del usuario ha sido verificado
   */
  isEmailVerified(): boolean {
    return this.email_verified;
  }

  /**
   * Obtiene la fecha de verificación del email
   */
  getEmailVerifiedAt(): Date | null | undefined {
    return this.email_verified_at;
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    if (!plainPassword || !this.password) {
      throw new Error(
        'Both plainPassword and hashedPassword are required for comparison',
      );
    }

    return bcrypt.compare(plainPassword, this.password);
  }

  // Método estático para hashear contraseñas
  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}

/**
 * User example
  
    {
        "name": "Anthony Cursewl",
        "username": "anthonycursewl",
        "email": "zerpaanthony.wx@breadriuss.com",
        "password": ""
    }

 * 
*/
