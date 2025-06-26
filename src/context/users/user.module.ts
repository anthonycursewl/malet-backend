import { Module } from "@nestjs/common";
import { CREATE_USER_USECASE } from "./domain/ports/in/create-user.usecase";
import { LOGIN_USER_USECASE } from "./domain/ports/in/login-user.usecase";
import { CreateUserService } from "./application/create-user.service";
import { LoginUserService } from "./application/login-user.service";
import { USER_REPOSITORY_PORT } from "./domain/ports/out/user.repository";
import { UserRepositoryAdapter } from "./infrastructure/persistence/user.repository.adapter";
import { UsersController } from "./infrastructure/adapters/controllers/users.controller";
import { PrismaModule } from "src/prisma.module";
import { AuthModule } from "src/auth/auth.module";
import { AuthController } from "./infrastructure/adapters/controllers/auth.controller";
import { AuthUseCase } from "./application/auth.service";

@Module({
    imports: [PrismaModule, AuthModule],
    providers: [
        {
            provide: CREATE_USER_USECASE,
            useClass: CreateUserService
        },
        {
            provide: LOGIN_USER_USECASE,
            useClass: LoginUserService
        },
        {
            provide: USER_REPOSITORY_PORT,
            useClass: UserRepositoryAdapter
        },
        AuthUseCase
    ],
    controllers: [UsersController, AuthController]
})
export class UserModule {}