import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
    UpdateCommunityUseCase,
    UpdateCommunityParams
} from '../domain/ports/in/update-community.usecase';
import {
    COMMUNITY_REPOSITORY_PORT,
    CommunityRepository,
    UpdateCommunityData
} from '../domain/ports/out/community.repository';
import {
    COMMUNITY_MEMBER_REPOSITORY_PORT,
    CommunityMemberRepository
} from '../domain/ports/out/community-member.repository';
import {
    FILE_STORAGE_PORT,
    FileStoragePort
} from 'src/shared/infrastructure/file-storage/file-storage.port';
import { Community } from '../domain/entities/community.entity';

@Injectable()
export class UpdateCommunityService implements UpdateCommunityUseCase {
    constructor(
        @Inject(COMMUNITY_REPOSITORY_PORT)
        private readonly communityRepository: CommunityRepository,
        @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
        private readonly memberRepository: CommunityMemberRepository,
        @Inject(FILE_STORAGE_PORT)
        private readonly fileStorage: FileStoragePort
    ) { }

    async execute(userId: string, communityId: string, params: UpdateCommunityParams): Promise<Community> {
        // Obtener la comunidad
        const community = await this.communityRepository.findById(communityId);
        if (!community) {
            throw new NotFoundException('Comunidad no encontrada');
        }

        // Verificar que el usuario tiene permisos para editar
        const member = await this.memberRepository.findByUserAndCommunity(userId, communityId);
        if (!member || !member.canEditSettings()) {
            throw new ForbiddenException('No tienes permisos para editar esta comunidad');
        }

        // Preparar datos de actualización
        const updateData: UpdateCommunityData = {};

        if (params.name !== undefined) {
            updateData.name = params.name;
        }

        if (params.description !== undefined) {
            updateData.description = params.description;
        }

        if (params.type !== undefined) {
            updateData.type = params.type;
        }

        if (params.isActive !== undefined) {
            // Solo el owner puede desactivar la comunidad
            if (!member.isOwner()) {
                throw new ForbiddenException('Solo el owner puede activar/desactivar la comunidad');
            }
            updateData.isActive = params.isActive;
        }

        // Manejar nuevo avatar
        if (params.avatarFile) {
            // Eliminar avatar anterior si existe
            if (community.getAvatarUrl()) {
                try {
                    await this.fileStorage.deleteFile(community.getAvatarUrl()!);
                } catch (error) {
                    // Ignorar errores al eliminar archivo anterior
                    console.warn('Error eliminando avatar anterior:', error);
                }
            }

            updateData.avatarUrl = await this.fileStorage.uploadFile({
                file: params.avatarFile.buffer,
                fileName: params.avatarFile.originalname,
                mimeType: params.avatarFile.mimetype,
                folder: `communities/${community.getSlug()}/avatar`
            });
        }

        // Manejar nuevo banner
        if (params.bannerFile) {
            // Eliminar banner anterior si existe
            if (community.getBannerUrl()) {
                try {
                    await this.fileStorage.deleteFile(community.getBannerUrl()!);
                } catch (error) {
                    // Ignorar errores al eliminar archivo anterior
                    console.warn('Error eliminando banner anterior:', error);
                }
            }

            updateData.bannerUrl = await this.fileStorage.uploadFile({
                file: params.bannerFile.buffer,
                fileName: params.bannerFile.originalname,
                mimeType: params.bannerFile.mimetype,
                folder: `communities/${community.getSlug()}/banner`
            });
        }

        // Actualizar la comunidad
        return this.communityRepository.update(communityId, updateData);
    }
}
