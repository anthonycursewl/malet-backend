import { Module } from "@nestjs/common";
import { CREATE_USER_USECASE } from "./domain/ports/in/create-user.usecase";
import { LOGIN_USER_USECASE } from "./domain/ports/in/login-user.usecase";
import { UPDATE_USER_PROFILE_USECASE } from "./domain/ports/in/update-user-profile.usecase";
import { CreateUserService } from "./application/create-user.service";
import { LoginUserService } from "./application/login-user.service";
import { UpdateUserProfileService } from "./application/update-user-profile.service";
import { USER_REPOSITORY_PORT } from "./domain/ports/out/user.repository";
import { UserRepositoryAdapter } from "./infrastructure/persistence/user.repository.adapter";
import { UsersController } from "./infrastructure/adapters/controllers/users.controller";
import { UserProfileController } from "./infrastructure/adapters/controllers/user-profile.controller";
import { PrismaModule } from "src/prisma.module";
import { AuthModule } from "src/auth/auth.module";
import { AuthController } from "./infrastructure/adapters/controllers/auth.controller";
import { AuthUseCase } from "./application/auth.service";
import { FileStorageModule } from "src/shared/infrastructure/file-storage/file-storage.module";
import { GET_USER_BY_USERNAME_USECASE } from "./domain/ports/in/get-user-by-username.usecase";
import { GetUserByUsernameService } from "./application/get-user-by-username.service";

@Module({
    imports: [PrismaModule, AuthModule, FileStorageModule],
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
            provide: UPDATE_USER_PROFILE_USECASE,
            useClass: UpdateUserProfileService
        },
        {
            provide: USER_REPOSITORY_PORT,
            useClass: UserRepositoryAdapter
        },
        {
            provide: GET_USER_BY_USERNAME_USECASE,
            useClass: GetUserByUsernameService
        },
        AuthUseCase
    ],
    controllers: [UsersController, AuthController, UserProfileController]
})
export class UserModule { }