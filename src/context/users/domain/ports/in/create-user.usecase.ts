import { User, UserPrimitives } from '../../entities/user.entity';

export const CREATE_USER_USECASE = 'CREATE_USER_USECASE';

/** Datos que el registro puede enviar; la verificación nunca viene del cliente. */
export type CreateUserInput = Pick<
  UserPrimitives,
  'name' | 'username' | 'email' | 'avatar_url' | 'banner_url'
> & { password: string };

export interface CreateUserUseCase {
  execute(user: CreateUserInput): Promise<User>;
}
