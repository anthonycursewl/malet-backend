import {
    Inject,
    Injectable,
    Logger,

} from '@nestjs/common';
import { LoginWithGoogleUseCase } from '../domain/ports/in/login-google-user.usecase';
import {
    GOOGLE_AUTH_SERVICE,
    IGoogleAuthService,
} from '../domain/ports/out/auth.service';
import {
    USER_REPOSITORY_PORT,
    UserRepository,
} from '../domain/ports/out/user.repository';
import { User } from '../domain/entities/user.entity';
import { AuthService } from 'src/shared/infrastructure/services/auth.service';

@Injectable()
export class LoginWithGoogleService implements LoginWithGoogleUseCase {
    private readonly logger = new Logger(LoginWithGoogleService.name);

    constructor(
        @Inject(GOOGLE_AUTH_SERVICE)
        private readonly googleAuthService: IGoogleAuthService,
        @Inject(USER_REPOSITORY_PORT)
        private readonly userRepository: UserRepository,
        private readonly authService: AuthService,
    ) { }

    async execute(idToken: string): Promise<{
        user: User;
        access_token: string;
    }> {
        this.logger.log('🔵 Starting Google login process...');

        // 1. Validate token
        this.logger.log('🔍 Validating Google token...');
        const googleUser =
            await this.googleAuthService.validateGoogleToken(idToken);
        this.logger.log(`✅ Google token validated for email: ${googleUser.email}`);

        // 2. Check if user exists
        this.logger.log(`🔍 Checking if user exists with email: ${googleUser.email}`);
        let user = await this.userRepository.findByEmail(googleUser.email);

        if (!user) {
            this.logger.log(`🆕 User not found. Creating new user from Google profile...`);
            // 3. Create user if not exists
            user = User.createFromGoogle(googleUser);
            user = await this.userRepository.save(user);
            this.logger.log(`✅ New user created with ID: ${user.getId()}`);
        } else {
            this.logger.log(`👋 User found with ID: ${user.getId()}. Proceeding to login...`);
        }

        // 4. Generate system token
        this.logger.log(`🔑 Generating system access token for user: ${user.getId()}`);
        const { access_token } = await this.authService.generateToken(user);
        this.logger.log(`✅ Login successful for user: ${user.getEmail()}`);

        return {
            user,
            access_token,
        };
    }
}

