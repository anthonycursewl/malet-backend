import { User } from '../../entities/user.entity';

export const LOGIN_GOOGLE_USER_USECASE = 'LOGIN_GOOGLE_USER_USECASE';

export interface LoginWithGoogleUseCase {
    execute(idToken: string): Promise<{
        user: User;
        access_token: string;
    }>;
}
