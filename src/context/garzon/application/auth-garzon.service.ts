import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AuthCredentials, AuthSession } from '../domain/entities/auth.entity';
import { AuthGarzonUseCase } from '../domain/ports/in/auth-garzon.usecase';
import {
  AUTH_GARZON_REPOSITORY,
  AuthGarzonRepository,
} from '../domain/ports/out/auth-garzon.repository';

/**
 * Application service that implements the AuthGarzonUseCase.
 * This is the concrete implementation of the authentication use case,
 * coordinating between the domain and infrastructure layers.
 */
@Injectable()
export class AuthGarzonService implements AuthGarzonUseCase {
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
