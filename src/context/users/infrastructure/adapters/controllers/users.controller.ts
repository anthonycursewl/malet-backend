import { Controller, Inject, Post } from "@nestjs/common";
import { CreateUserUseCase } from "src/context/users/domain/ports/in/create-user.usecase";
import { User, UserPrimitives } from "src/context/users/domain/entities/user.entity";
import { Body } from "@nestjs/common";
import { CREATE_USER_USECASE } from "src/context/users/domain/ports/in/create-user.usecase";
import { LoginUserUseCase } from "src/context/users/domain/ports/in/login-user.usecase";
import { LOGIN_USER_USECASE } from "src/context/users/domain/ports/in/login-user.usecase";

@Controller('users')
export class UsersController {
    constructor(
        @Inject(CREATE_USER_USECASE)
        private readonly createUserService: CreateUserUseCase,
        @Inject(LOGIN_USER_USECASE)
        private readonly loginUserService: LoginUserUseCase
    ) {}

    @Post('save')
    async createUser(@Body() user: Omit<UserPrimitives, 'id' | 'created_at'>): Promise<User> {
        return this.createUserService.execute(user);
    }

    @Post('login')
    async login(@Body() credentials: { email: string, password: string }) {
        return this.loginUserService.execute(credentials);
    }
}