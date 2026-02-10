import { User } from '../../entities/user.entity';

export const LOGIN_USER_USECASE = 'LOGIN_USER_USECASE';

export interface LoginUserUseCase {
  execute(credentials: { email: string; password: string }): Promise<{
    user: User;
    access_token: string;
  }>;
}
