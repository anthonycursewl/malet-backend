import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { GetCommunityUseCase } from '../domain/ports/in/get-community.usecase';
import {
    COMMUNITY_REPOSITORY_PORT,
    CommunityRepository
} from '../domain/ports/out/community.repository';
import { Community } from '../domain/entities/community.entity';

@Injectable()
export class GetCommunityService implements GetCommunityUseCase {
    constructor(
        @Inject(COMMUNITY_REPOSITORY_PORT)
        private readonly communityRepository: CommunityRepository
    ) { }

    async execute(idOrSlug: string): Promise<Community | null> {
        // Primero intentar buscar por ID
        let community = await this.communityRepository.findById(idOrSlug);

        // Si no se encuentra por ID, buscar por slug
        if (!community) {
            community = await this.communityRepository.findBySlug(idOrSlug);
        }

        return community;
    }
}
