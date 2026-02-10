import { Injectable, Inject } from '@nestjs/common';
import {
  SearchCommunitiesUseCase,
  SearchCommunitiesParams,
  SearchCommunitiesResult,
} from '../domain/ports/in/search-communities.usecase';
import {
  COMMUNITY_REPOSITORY_PORT,
  CommunityRepository,
} from '../domain/ports/out/community.repository';

@Injectable()
export class SearchCommunitiesService implements SearchCommunitiesUseCase {
  constructor(
    @Inject(COMMUNITY_REPOSITORY_PORT)
    private readonly communityRepository: CommunityRepository,
  ) {}

  async execute(
    params: SearchCommunitiesParams,
  ): Promise<SearchCommunitiesResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const result = await this.communityRepository.search({
      query: params.query,
      type: params.type,
      page,
      limit,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      communities: result.communities,
      total: result.total,
      page,
      totalPages,
    };
  }
}
