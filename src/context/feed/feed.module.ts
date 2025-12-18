import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

// Use Cases - Tokens
import { GET_FEED_USECASE } from './domain/ports/in/get-feed.usecase';
import { TRACK_INTERACTION_USECASE } from './domain/ports/in/track-interaction.usecase';

// Services
import { GetFeedService } from './application/get-feed.service';
import { TrackInteractionService } from './application/track-interaction.service';
import { RecommendationEngineService } from './application/recommendation-engine.service';

// Repositories - Tokens
import { USER_INTERACTION_REPOSITORY_PORT } from './domain/ports/out/user-interaction.repository';
import { COMMUNITY_SCORE_REPOSITORY_PORT } from './domain/ports/out/community-score.repository';

// Repository Adapters
import { UserInteractionRepositoryAdapter } from './infrastructure/persistence/user-interaction.repository.adapter';
import { CommunityScoreRepositoryAdapter } from './infrastructure/persistence/community-score.repository.adapter';

// Controllers
import { FeedController } from './infrastructure/adapters/controllers/feed.controller';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        OnboardingModule // Importar para acceder a repositorios de intereses
    ],
    providers: [
        // ============ ENGINE (Singleton) ============
        RecommendationEngineService,

        // ============ USE CASES ============
        {
            provide: GET_FEED_USECASE,
            useClass: GetFeedService
        },
        {
            provide: TRACK_INTERACTION_USECASE,
            useClass: TrackInteractionService
        },

        // ============ REPOSITORIES ============
        {
            provide: USER_INTERACTION_REPOSITORY_PORT,
            useClass: UserInteractionRepositoryAdapter
        },
        {
            provide: COMMUNITY_SCORE_REPOSITORY_PORT,
            useClass: CommunityScoreRepositoryAdapter
        }
    ],
    controllers: [
        FeedController
    ],
    exports: [
        RecommendationEngineService,
        USER_INTERACTION_REPOSITORY_PORT,
        COMMUNITY_SCORE_REPOSITORY_PORT
    ]
})
export class FeedModule { }
