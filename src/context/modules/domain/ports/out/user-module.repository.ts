import { UserModule } from '../../entities/user-module.entity';

export const USER_MODULE_REPOSITORY_PORT = Symbol(
  'USER_MODULE_REPOSITORY_PORT',
);

export interface UserModuleRepository {
  findByUserAndKey(
    user_id: string,
    module_key: string,
  ): Promise<UserModule | null>;
  findManyByUser(user_id: string): Promise<UserModule[]>;
  /** Creates the row when missing, otherwise updates its enabled state. */
  save(module: UserModule): Promise<UserModule>;
}
