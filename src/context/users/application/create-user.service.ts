import { Inject, Injectable } from "@nestjs/common";
import { CreateUserUseCase } from "../domain/ports/in/create-user.usecase";
import { User } from "../domain/entities/user.entity";
import { USER_REPOSITORY_PORT, UserRepository } from "../domain/ports/out/user.repository";
import { UserPrimitives } from "../domain/entities/user.entity";

@Injectable()
export class CreateUserService implements CreateUserUseCase {
    constructor(
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository
    ) {}
    
    async execute(user: Omit<UserPrimitives, 'id' | 'created_at'>): Promise<User> {
        const created = await User.create(user)
        return this.userRepository.save(created);
    }
}