import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AuthCredentials, AuthSession } from '../domain/entities/auth.entity';
import { AuthGarzonUseCase } from '../domain/ports/in/auth-garzon.usecase';
import {
  AUTH_GARZON_REPOSITORY,
  AuthGarzonRepository,
} from '../domain/ports/out/auth-garzon.repository';

/**
 * Login use case implementation for Garzon authentication.
 * Implements the AuthGarzonUseCase interface (input port).
 */
@Injectable()
export class LoginGarzonUseCase implements AuthGarzonUseCase {
  constructor(
    @Inject(AUTH_GARZON_REPOSITORY)
    private readonly authGarzonRepository: AuthGarzonRepository,
  ) {}

  async execute(credentials: AuthCredentials): Promise<AuthSession> {
    if (!credentials.username || !credentials.password) {
      throw new BadRequestException('Username and password are required');
    }
    return await this.authGarzonRepository.login(credentials);
  }
}
