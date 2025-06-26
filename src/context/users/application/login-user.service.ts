import { Injectable } from "@nestjs/common";
import { LoginUserUseCase } from "../domain/ports/in/login-user.usecase";
import { User } from "../domain/entities/user.entity";
import { Inject } from "@nestjs/common";
import { USER_REPOSITORY_PORT, UserRepository } from "../domain/ports/out/user.repository";
import { AuthService } from "src/shared/infrastructure/services/auth.service";

@Injectable()
export class LoginUserService implements LoginUserUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository,
        private readonly authService: AuthService
    ) {}
    
    async execute(credentials: { email: string, password: string }): Promise<{ user: User, access_token: string }> {
        const user = await this.userRepository.login(credentials);
        const { access_token } = await this.authService.generateToken(user);
        
        return {
            user,
            access_token
        };
    }
}