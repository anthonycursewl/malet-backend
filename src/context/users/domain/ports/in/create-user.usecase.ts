import { User, UserPrimitives } from '../../entities/user.entity';

export const CREATE_USER_USECASE = 'CREATE_USER_USECASE';

export interface CreateUserUseCase {
  execute(user: Omit<UserPrimitives, 'id' | 'created_at'>): Promise<User>;
}
