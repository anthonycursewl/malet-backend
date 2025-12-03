import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { GetUserByUsernameUseCase } from "../domain/ports/in/get-user-by-username.usecase";
import { USER_REPOSITORY_PORT, UserRepository } from "../domain/ports/out/user.repository";
import { User } from "../domain/entities/user.entity";

@Injectable()
export class GetUserByUsernameService implements GetUserByUsernameUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository
    ) { }

    async execute(username: string): Promise<User | string> {
        const user = await this.userRepository.findByUsername(username, true)
        return user
    }
}