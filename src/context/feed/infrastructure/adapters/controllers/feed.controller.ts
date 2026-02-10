import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
  GET_FEED_USECASE,
  GetFeedUseCase,
} from '../../../domain/ports/in/get-feed.usecase';
import {
  TRACK_INTERACTION_USECASE,
  TrackInteractionUseCase,
} from '../../../domain/ports/in/track-interaction.usecase';

// DTOs
import {
  TrackInteractionDto,
  TrackViewsDto,
} from '../dtos/track-interaction.dto';
import { InteractionType } from '../../../domain/entities/user-interaction.entity';

@Controller('feed')
export class FeedController {
  constructor(
    @Inject(GET_FEED_USECASE)
    private readonly getFeedUseCase: GetFeedUseCase,
    @Inject(TRACK_INTERACTION_USECASE)
    private readonly trackInteractionUseCase: TrackInteractionUseCase,
  ) {}

  /**
   * Obtener feed personalizado
   * GET /feed
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getFeed(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('excludeJoined') excludeJoined?: boolean,
  ) {
    const result = await this.getFeedUseCase.execute(user.userId, {
      page: page || 1,
      limit: limit || 20,
      excludeJoined: excludeJoined !== false,
    });

    return {
      items: result.items.map((item) => ({
        community: item.community.toPrimitives(),
        score: item.score.toPrimitives(),
        reasons: item.reasons,
      })),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
  }

  /**
   * Obtener comunidades trending
   * GET /feed/trending
   */
  @Get('trending')
  async getTrending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.getFeedUseCase.getTrending({
      page: page || 1,
      limit: limit || 20,
    });

    return {
      items: result.items.map((item) => ({
        community: item.community.toPrimitives(),
        reasons: item.reasons,
      })),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
  }

  /**
   * Explorar comunidades
   * GET /feed/explore
   */
  @Get('explore')
  async getExplore(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.getFeedUseCase.getExplore({
      page: page || 1,
      limit: limit || 20,
    });

    return {
      items: result.items.map((item) => ({
        community: item.community.toPrimitives(),
        reasons: item.reasons,
      })),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
  }

  /**
   * Registrar una interacción
   * POST /feed/interactions
   */
  @Post('interactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async trackInteraction(
    @CurrentUser() user: { userId: string },
    @Body() dto: TrackInteractionDto,
  ) {
    const interaction = await this.trackInteractionUseCase.execute(
      user.userId,
      {
        communityId: dto.communityId,
        interaction: dto.interaction as InteractionType,
        metadata: dto.metadata,
      },
    );

    return {
      message: 'Interacción registrada',
      interaction: interaction.toPrimitives(),
    };
  }

  /**
   * Registrar múltiples views
   * POST /feed/views
   */
  @Post('views')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async trackViews(
    @CurrentUser() user: { userId: string },
    @Body() dto: TrackViewsDto,
  ) {
    await this.trackInteractionUseCase.trackViews(
      user.userId,
      dto.communityIds,
    );

    return {
      message: 'Views registrados',
      count: dto.communityIds.length,
    };
  }
}
