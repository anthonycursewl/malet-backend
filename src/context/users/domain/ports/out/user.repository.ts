import { User } from "../../entities/user.entity";

export interface UpdateUserProfileParams {
    userId: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    bannerUrl?: string;
}

export interface UserRepository {
    save(user: User): Promise<User>
    login({ email, password }: { email: string, password: string }): Promise<User>
    findByEmail(email: string): Promise<User>
    findById(id: string): Promise<User>
    findByUsername(username: string, onlyUsername?: boolean): Promise<User | string>
    updateProfile(params: UpdateUserProfileParams): Promise<User>
}

export const USER_REPOSITORY_PORT = 'USER_REPOSITORY_PORT'