import { Injectable, Inject } from '@nestjs/common';
import {
    GetUserCommunitiesUseCase,
    GetUserCommunitiesResult
} from '../domain/ports/in/get-user-communities.usecase';
import {
    COMMUNITY_REPOSITORY_PORT,
    CommunityRepository
} from '../domain/ports/out/community.repository';
import {
    COMMUNITY_MEMBER_REPOSITORY_PORT,
    CommunityMemberRepository
} from '../domain/ports/out/community-member.repository';
import { Community } from '../domain/entities/community.entity';

@Injectable()
export class GetUserCommunitiesService implements GetUserCommunitiesUseCase {
    constructor(
        @Inject(COMMUNITY_REPOSITORY_PORT)
        private readonly communityRepository: CommunityRepository,
        @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
        private readonly memberRepository: CommunityMemberRepository
    ) { }

    async execute(userId: string): Promise<GetUserCommunitiesResult> {
        // Obtener comunidades propias
        const owned = await this.communityRepository.findByOwnerId(userId);

        // Obtener membresías activas
        const memberships = await this.memberRepository.findActiveByUserId(userId);

        // Obtener las comunidades de las membresías (excluyendo las propias)
        const ownedIds = new Set(owned.map(c => c.getId()));
        const membershipCommunities: Community[] = [];

        for (const membership of memberships) {
            if (!ownedIds.has(membership.getCommunityId())) {
                const community = await this.communityRepository.findById(membership.getCommunityId());
                if (community) {
                    membershipCommunities.push(community);
                }
            }
        }

        return {
            owned,
            memberships: membershipCommunities
        };
    }
}
