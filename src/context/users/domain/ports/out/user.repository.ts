import { User } from "../../entities/user.entity"

export const USER_REPOSITORY_PORT = 'USER_REPOSITORY_PORT' 

export interface UserRepository {
    save(user: User): Promise<User>
    login({ email, password }: { email: string, password: string }): Promise<User>
    findByEmail(email: string): Promise<User>
}