import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Inject,
    UseInterceptors,
    UploadedFiles,
    NotFoundException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
    CREATE_COMMUNITY_USECASE,
    CreateCommunityUseCase
} from '../../../domain/ports/in/create-community.usecase';
import {
    GET_COMMUNITY_USECASE,
    GetCommunityUseCase
} from '../../../domain/ports/in/get-community.usecase';
import {
    SEARCH_COMMUNITIES_USECASE,
    SearchCommunitiesUseCase
} from '../../../domain/ports/in/search-communities.usecase';
import {
    UPDATE_COMMUNITY_USECASE,
    UpdateCommunityUseCase
} from '../../../domain/ports/in/update-community.usecase';
import {
    DELETE_COMMUNITY_USECASE,
    DeleteCommunityUseCase
} from '../../../domain/ports/in/delete-community.usecase';
import {
    GET_USER_COMMUNITIES_USECASE,
    GetUserCommunitiesUseCase
} from '../../../domain/ports/in/get-user-communities.usecase';

// DTOs
import { CreateCommunityDto } from '../dtos/create-community.dto';
import { UpdateCommunityDto } from '../dtos/update-community.dto';
import { SearchCommunitiesDto } from '../dtos/search-communities.dto';

// Enums
import { CommunityType } from '../../../domain/enums/community-type.enum';

@Controller('communities')
export class CommunitiesController {
    constructor(
        @Inject(CREATE_COMMUNITY_USECASE)
        private readonly createCommunityUseCase: CreateCommunityUseCase,
        @Inject(GET_COMMUNITY_USECASE)
        private readonly getCommunityUseCase: GetCommunityUseCase,
        @Inject(SEARCH_COMMUNITIES_USECASE)
        private readonly searchCommunitiesUseCase: SearchCommunitiesUseCase,
        @Inject(UPDATE_COMMUNITY_USECASE)
        private readonly updateCommunityUseCase: UpdateCommunityUseCase,
        @Inject(DELETE_COMMUNITY_USECASE)
        private readonly deleteCommunityUseCase: DeleteCommunityUseCase,
        @Inject(GET_USER_COMMUNITIES_USECASE)
        private readonly getUserCommunitiesUseCase: GetUserCommunitiesUseCase
    ) { }

    /**
     * Crear una nueva comunidad
     * POST /communities
     */
    @Post()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ]))
    async create(
        @CurrentUser() user: { userId: string },
        @Body() dto: CreateCommunityDto,
        @UploadedFiles() files: { avatar?: Express.Multer.File[], banner?: Express.Multer.File[] }
    ) {
        const community = await this.createCommunityUseCase.execute(user.userId, {
            name: dto.name,
            description: dto.description,
            type: dto.type || CommunityType.PUBLIC,
            avatarFile: files?.avatar?.[0],
            bannerFile: files?.banner?.[0]
        });

        return {
            message: 'Comunidad creada exitosamente',
            community: community.toPrimitives()
        };
    }

    /**
     * Buscar comunidades
     * GET /communities/search
     */
    @Get('search')
    async search(@Query() dto: SearchCommunitiesDto) {
        const result = await this.searchCommunitiesUseCase.execute({
            query: dto.query,
            type: dto.type,
            page: dto.page,
            limit: dto.limit
        });

        return {
            communities: result.communities.map(c => c.toPrimitives()),
            total: result.total,
            page: result.page,
            totalPages: result.totalPages
        };
    }

    /**
     * Obtener mis comunidades
     * GET /communities/my
     */
    @Get('my')
    @UseGuards(JwtAuthGuard)
    async getMyCommunities(@CurrentUser() user: { userId: string }) {
        const result = await this.getUserCommunitiesUseCase.execute(user.userId);

        return {
            owned: result.owned.map(c => c.toPrimitives()),
            memberships: result.memberships.map(c => c.toPrimitives())
        };
    }

    /**
     * Obtener una comunidad por ID o slug
     * GET /communities/:idOrSlug
     */
    @Get(':idOrSlug')
    async getOne(@Param('idOrSlug') idOrSlug: string) {
        const community = await this.getCommunityUseCase.execute(idOrSlug);

        if (!community) {
            throw new NotFoundException('Comunidad no encontrada');
        }

        return {
            community: community.toPrimitives()
        };
    }

    /**
     * Actualizar una comunidad
     * PUT /communities/:id
     */
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ]))
    async update(
        @CurrentUser() user: { userId: string },
        @Param('id') communityId: string,
        @Body() dto: UpdateCommunityDto,
        @UploadedFiles() files: { avatar?: Express.Multer.File[], banner?: Express.Multer.File[] }
    ) {
        const community = await this.updateCommunityUseCase.execute(user.userId, communityId, {
            name: dto.name,
            description: dto.description,
            type: dto.type,
            isActive: dto.isActive,
            avatarFile: files?.avatar?.[0],
            bannerFile: files?.banner?.[0]
        });

        return {
            message: 'Comunidad actualizada exitosamente',
            community: community.toPrimitives()
        };
    }

    /**
     * Eliminar una comunidad
     * DELETE /communities/:id
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async delete(
        @CurrentUser() user: { userId: string },
        @Param('id') communityId: string
    ) {
        await this.deleteCommunityUseCase.execute(user.userId, communityId);

        return {
            message: 'Comunidad eliminada exitosamente'
        };
    }
}
