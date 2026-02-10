import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  USER_REPOSITORY_PORT,
  UserRepository,
} from '../domain/ports/out/user.repository';
import { User } from '../domain/entities/user.entity';
import { AuthService } from 'src/shared/infrastructure/services/auth.service';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly authService: AuthService,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepository,
  ) {}

  async validate(token: string): Promise<User> {
    const isValid = await this.authService.validate(token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid token.');
    }
    const user = await this.userRepository.findByEmail(isValid.email);
    console.log(user);
    return user;
  }
}
