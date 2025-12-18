import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Inject,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
    GET_INTEREST_CATEGORIES_USECASE,
    GetInterestCategoriesUseCase
} from '../../../domain/ports/in/get-interest-categories.usecase';
import {
    SAVE_USER_INTERESTS_USECASE,
    SaveUserInterestsUseCase
} from '../../../domain/ports/in/save-user-interests.usecase';
import {
    GET_ONBOARDING_STATUS_USECASE,
    GetOnboardingStatusUseCase
} from '../../../domain/ports/in/get-onboarding-status.usecase';
import {
    COMPLETE_ONBOARDING_USECASE,
    CompleteOnboardingUseCase
} from '../../../domain/ports/in/complete-onboarding.usecase';

// DTOs
import { SaveInterestsDto } from '../dtos/save-interests.dto';

@Controller('onboarding')
export class OnboardingController {
    constructor(
        @Inject(GET_INTEREST_CATEGORIES_USECASE)
        private readonly getInterestCategoriesUseCase: GetInterestCategoriesUseCase,
        @Inject(SAVE_USER_INTERESTS_USECASE)
        private readonly saveUserInterestsUseCase: SaveUserInterestsUseCase,
        @Inject(GET_ONBOARDING_STATUS_USECASE)
        private readonly getOnboardingStatusUseCase: GetOnboardingStatusUseCase,
        @Inject(COMPLETE_ONBOARDING_USECASE)
        private readonly completeOnboardingUseCase: CompleteOnboardingUseCase
    ) { }

    /**
     * Obtener categorías de interés disponibles
     * GET /onboarding/interests
     */
    @Get('interests')
    async getInterests() {
        const categories = await this.getInterestCategoriesUseCase.execute();

        return {
            categories: categories.map(c => c.toPrimitives())
        };
    }

    /**
     * Guardar intereses seleccionados por el usuario
     * POST /onboarding/interests
     */
    @Post('interests')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async saveInterests(
        @CurrentUser() user: { userId: string },
        @Body() dto: SaveInterestsDto
    ) {
        const result = await this.saveUserInterestsUseCase.execute(user.userId, {
            categoryIds: dto.categoryIds
        });

        return {
            message: 'Intereses guardados exitosamente',
            interests: result.interests.map(i => i.toPrimitives()),
            count: result.count
        };
    }

    /**
     * Obtener estado del onboarding del usuario
     * GET /onboarding/status
     */
    @Get('status')
    @UseGuards(JwtAuthGuard)
    async getStatus(@CurrentUser() user: { userId: string }) {
        const result = await this.getOnboardingStatusUseCase.execute(user.userId);

        return {
            onboarding: result.onboarding.toPrimitives(),
            needsOnboarding: result.needsOnboarding,
            progress: result.progress,
            nextStep: result.nextStep
        };
    }

    /**
     * Marcar onboarding como completado
     * POST /onboarding/complete
     */
    @Post('complete')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async complete(@CurrentUser() user: { userId: string }) {
        const onboarding = await this.completeOnboardingUseCase.complete(user.userId);

        return {
            message: 'Onboarding completado',
            onboarding: onboarding.toPrimitives()
        };
    }

    /**
     * Saltar onboarding
     * POST /onboarding/skip
     */
    @Post('skip')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async skip(@CurrentUser() user: { userId: string }) {
        const onboarding = await this.completeOnboardingUseCase.skip(user.userId);

        return {
            message: 'Onboarding saltado',
            onboarding: onboarding.toPrimitives()
        };
    }
}
