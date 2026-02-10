import { User } from '../../entities/user.entity';

export interface UpdateUserProfileParams {
  userId: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface UserRepository {
  save(user: User): Promise<User>;
  login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByUsername(
    username: string,
    onlyUsername?: boolean,
  ): Promise<User | string | null>;
  updateProfile(params: UpdateUserProfileParams): Promise<User>;

  /**
   * Marca el email de un usuario como verificado
   */
  verifyEmail(userId: string): Promise<void>;
}

export const USER_REPOSITORY_PORT = 'USER_REPOSITORY_PORT';
