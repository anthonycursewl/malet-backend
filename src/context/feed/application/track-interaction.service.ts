import { Injectable, Inject } from '@nestjs/common';
import {
  TrackInteractionUseCase,
  TrackInteractionParams,
} from '../domain/ports/in/track-interaction.usecase';
import {
  USER_INTERACTION_REPOSITORY_PORT,
  UserInteractionRepository,
} from '../domain/ports/out/user-interaction.repository';
import { UserInteraction } from '../domain/entities/user-interaction.entity';

@Injectable()
export class TrackInteractionService implements TrackInteractionUseCase {
  constructor(
    @Inject(USER_INTERACTION_REPOSITORY_PORT)
    private readonly interactionRepository: UserInteractionRepository,
  ) {}

  async execute(
    userId: string,
    params: TrackInteractionParams,
  ): Promise<UserInteraction> {
    const interaction = UserInteraction.create(
      userId,
      params.communityId,
      params.interaction,
      params.metadata || null,
    );

    return this.interactionRepository.save(interaction);
  }

  async trackViews(userId: string, communityIds: string[]): Promise<void> {
    const interactions = communityIds.map((communityId) =>
      UserInteraction.create(userId, communityId, 'view'),
    );

    await this.interactionRepository.saveMany(interactions);
  }
}
