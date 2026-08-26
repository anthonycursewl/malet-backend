import { Controller, Inject, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateUserUseCase } from 'src/context/users/domain/ports/in/create-user.usecase';
import {
  User,
  UserPrimitives,
} from 'src/context/users/domain/entities/user.entity';
import { CREATE_USER_USECASE } from 'src/context/users/domain/ports/in/create-user.usecase';
import { LoginUserUseCase } from 'src/context/users/domain/ports/in/login-user.usecase';
import { LOGIN_USER_USECASE } from 'src/context/users/domain/ports/in/login-user.usecase';
import { RegisterUserDto, LoginUserDto } from '../dtos/auth.dto';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(CREATE_USER_USECASE)
    private readonly createUserService: CreateUserUseCase,
    @Inject(LOGIN_USER_USECASE)
    private readonly loginUserService: LoginUserUseCase,
  ) {}

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() user: RegisterUserDto,
  ): Promise<User> {
    return this.createUserService.execute({
      ...user,
      verified: user.verified ?? false,
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() credentials: LoginUserDto) {
    return this.loginUserService.execute(credentials);
  }
}
