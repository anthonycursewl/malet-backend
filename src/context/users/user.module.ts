import { Module } from '@nestjs/common';
import { CREATE_USER_USECASE } from './domain/ports/in/create-user.usecase';
import { LOGIN_USER_USECASE } from './domain/ports/in/login-user.usecase';
import { UPDATE_USER_PROFILE_USECASE } from './domain/ports/in/update-user-profile.usecase';
import { VERIFY_EMAIL_USECASE } from './domain/ports/in/verify-email.usecase';
import { RESEND_VERIFICATION_USECASE } from './domain/ports/in/resend-verification.usecase';
import { CreateUserService } from './application/create-user.service';
import { LoginUserService } from './application/login-user.service';
import { UpdateUserProfileService } from './application/update-user-profile.service';
import { VerifyEmailService } from './application/verify-email.service';
import { ResendVerificationService } from './application/resend-verification.service';
import { USER_REPOSITORY_PORT } from './domain/ports/out/user.repository';
import { TOKEN_REPOSITORY_PORT } from './domain/ports/out/token.repository';
import { UserRepositoryAdapter } from './infrastructure/persistence/user.repository.adapter';
import { TokenRepositoryAdapter } from './infrastructure/persistence/token.repository.adapter';
import { UsersController } from './infrastructure/adapters/controllers/users.controller';
import { UserProfileController } from './infrastructure/adapters/controllers/user-profile.controller';
import { EmailVerificationController } from './infrastructure/adapters/controllers/email-verification.controller';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { AuthController } from './infrastructure/adapters/controllers/auth.controller';
import { AuthUseCase } from './application/auth.service';
import { FileStorageModule } from 'src/shared/infrastructure/file-storage/file-storage.module';
import { GET_USER_BY_USERNAME_USECASE } from './domain/ports/in/get-user-by-username.usecase';
import { GetUserByUsernameService } from './application/get-user-by-username.service';
import { LOGIN_GOOGLE_USER_USECASE } from './domain/ports/in/login-google-user.usecase';
import { LoginWithGoogleService } from './application/login-with-google.service';
import { GOOGLE_AUTH_SERVICE } from './domain/ports/out/auth.service';
import { GoogleAuthService } from './infrastructure/services/google-auth.provider';


@Module({
  imports: [PrismaModule, AuthModule, FileStorageModule],
  providers: [
    // Casos de uso de usuarios
    {
      provide: CREATE_USER_USECASE,
      useClass: CreateUserService,
    },
    {
      provide: LOGIN_USER_USECASE,
      useClass: LoginUserService,
    },
    {
      provide: UPDATE_USER_PROFILE_USECASE,
      useClass: UpdateUserProfileService,
    },
    {
      provide: GET_USER_BY_USERNAME_USECASE,
      useClass: GetUserByUsernameService,
    },
    {
      provide: LOGIN_GOOGLE_USER_USECASE,
      useClass: LoginWithGoogleService,
    },
    {
      provide: GOOGLE_AUTH_SERVICE,
      useClass: GoogleAuthService,
    },


    // Casos de uso de verificación de email
    {
      provide: VERIFY_EMAIL_USECASE,
      useClass: VerifyEmailService,
    },
    {
      provide: RESEND_VERIFICATION_USECASE,
      useClass: ResendVerificationService,
    },

    // Repositorios
    {
      provide: USER_REPOSITORY_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: TOKEN_REPOSITORY_PORT,
      useClass: TokenRepositoryAdapter,
    },

    // Auth
    AuthUseCase,
  ],
  controllers: [
    UsersController,
    AuthController,
    UserProfileController,
    EmailVerificationController,
  ],
  exports: [USER_REPOSITORY_PORT],
})
export class UserModule { }
