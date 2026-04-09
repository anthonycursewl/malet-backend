import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/context/users/user.module';

// Use Cases - Tokens
import { INIT_WEB_SESSION_USE_CASE } from './domain/ports/in/init-web-session.usecase';
import { AUTHORIZE_WEB_SESSION_USE_CASE } from './domain/ports/in/authorize-web-session.usecase';
import { GET_WEB_SESSION_STATUS_USE_CASE } from './domain/ports/in/get-web-session-status.usecase';

// Services
import { InitWebSessionService } from './application/init-web-session.service';
import { AuthorizeWebSessionService } from './application/authorize-web-session.service';
import { GetWebSessionStatusService } from './application/get-web-session-status.service';

// Repositories - Tokens
import { WEB_AUTH_SESSION_REPOSITORY } from './domain/ports/out/web-auth-session.repository';

// Repository Adapters
import { WebAuthSessionRepositoryAdapter } from './infrastructure/persistence/web-auth-session.repository.adapter';

// Controllers
import { WebAuthController } from './infrastructure/adapters/controllers/web-auth.controller';

@Module({
    imports: [PrismaModule, AuthModule, UserModule],
    providers: [
        // ============ USE CASES ============
        {
            provide: INIT_WEB_SESSION_USE_CASE,
            useClass: InitWebSessionService,
        },
        {
            provide: AUTHORIZE_WEB_SESSION_USE_CASE,
            useClass: AuthorizeWebSessionService,
        },
        {
            provide: GET_WEB_SESSION_STATUS_USE_CASE,
            useClass: GetWebSessionStatusService,
        },

        // ============ REPOSITORIES ============
        {
            provide: WEB_AUTH_SESSION_REPOSITORY,
            useClass: WebAuthSessionRepositoryAdapter,
        },
    ],
    controllers: [WebAuthController],
})
export class WebAuthModule { }
