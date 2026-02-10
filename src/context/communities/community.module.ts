import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { FileStorageModule } from 'src/shared/infrastructure/file-storage/file-storage.module';

// Use Cases - Tokens
import { CREATE_COMMUNITY_USECASE } from './domain/ports/in/create-community.usecase';
import { GET_COMMUNITY_USECASE } from './domain/ports/in/get-community.usecase';
import { SEARCH_COMMUNITIES_USECASE } from './domain/ports/in/search-communities.usecase';
import { UPDATE_COMMUNITY_USECASE } from './domain/ports/in/update-community.usecase';
import { DELETE_COMMUNITY_USECASE } from './domain/ports/in/delete-community.usecase';
import { JOIN_COMMUNITY_USECASE } from './domain/ports/in/join-community.usecase';
import { LEAVE_COMMUNITY_USECASE } from './domain/ports/in/leave-community.usecase';
import { MANAGE_MEMBERS_USECASE } from './domain/ports/in/manage-members.usecase';
import { GET_USER_COMMUNITIES_USECASE } from './domain/ports/in/get-user-communities.usecase';

// Services
import { CreateCommunityService } from './application/create-community.service';
import { GetCommunityService } from './application/get-community.service';
import { SearchCommunitiesService } from './application/search-communities.service';
import { UpdateCommunityService } from './application/update-community.service';
import { DeleteCommunityService } from './application/delete-community.service';
import { JoinCommunityService } from './application/join-community.service';
import { LeaveCommunityService } from './application/leave-community.service';
import { ManageMembersService } from './application/manage-members.service';
import { GetUserCommunitiesService } from './application/get-user-communities.service';

// Repositories - Tokens
import { COMMUNITY_REPOSITORY_PORT } from './domain/ports/out/community.repository';
import { COMMUNITY_MEMBER_REPOSITORY_PORT } from './domain/ports/out/community-member.repository';

// Repository Adapters
import { CommunityRepositoryAdapter } from './infrastructure/persistence/community.repository.adapter';
import { CommunityMemberRepositoryAdapter } from './infrastructure/persistence/community-member.repository.adapter';

// Controllers
import { CommunitiesController } from './infrastructure/adapters/controllers/communities.controller';
import { CommunityMembersController } from './infrastructure/adapters/controllers/community-members.controller';

@Module({
  imports: [PrismaModule, AuthModule, FileStorageModule],
  providers: [
    // ============ USE CASES ============

    // Community CRUD
    {
      provide: CREATE_COMMUNITY_USECASE,
      useClass: CreateCommunityService,
    },
    {
      provide: GET_COMMUNITY_USECASE,
      useClass: GetCommunityService,
    },
    {
      provide: SEARCH_COMMUNITIES_USECASE,
      useClass: SearchCommunitiesService,
    },
    {
      provide: UPDATE_COMMUNITY_USECASE,
      useClass: UpdateCommunityService,
    },
    {
      provide: DELETE_COMMUNITY_USECASE,
      useClass: DeleteCommunityService,
    },
    {
      provide: GET_USER_COMMUNITIES_USECASE,
      useClass: GetUserCommunitiesService,
    },

    // Member Management
    {
      provide: JOIN_COMMUNITY_USECASE,
      useClass: JoinCommunityService,
    },
    {
      provide: LEAVE_COMMUNITY_USECASE,
      useClass: LeaveCommunityService,
    },
    {
      provide: MANAGE_MEMBERS_USECASE,
      useClass: ManageMembersService,
    },

    // ============ REPOSITORIES ============
    {
      provide: COMMUNITY_REPOSITORY_PORT,
      useClass: CommunityRepositoryAdapter,
    },
    {
      provide: COMMUNITY_MEMBER_REPOSITORY_PORT,
      useClass: CommunityMemberRepositoryAdapter,
    },
  ],
  controllers: [CommunitiesController, CommunityMembersController],
  exports: [COMMUNITY_REPOSITORY_PORT, COMMUNITY_MEMBER_REPOSITORY_PORT],
})
export class CommunityModule {}
