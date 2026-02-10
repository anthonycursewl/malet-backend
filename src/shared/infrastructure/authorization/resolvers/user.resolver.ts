import { Injectable, Inject } from '@nestjs/common';
import { ResourceResolver } from './resource-resolver.interface';
import { User } from 'src/context/users/domain/entities/user.entity';
import {
  USER_REPOSITORY_PORT,
  UserRepository,
} from 'src/context/users/domain/ports/out/user.repository';

/**
 * Resolver para recursos de tipo User.
 * Obtiene el usuario desde el repositorio para verificación de políticas.
 */
@Injectable()
export class UserResourceResolver implements ResourceResolver<User> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Resuelve un usuario por su ID
   */
  async resolve(resourceId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(resourceId);
    } catch {
      return null;
    }
  }
}
