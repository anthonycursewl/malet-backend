import { User } from "../../entities/user.entity"
export const GET_USER_BY_USERNAME_USECASE = 'GET_USER_BY_USERNAME_USECASE'

export interface GetUserByUsernameUseCase {
    execute(username: string): Promise<User | string>
}