import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteCommunityUseCase } from '../domain/ports/in/delete-community.usecase';
import {
    COMMUNITY_REPOSITORY_PORT,
    CommunityRepository
} from '../domain/ports/out/community.repository';
import {
    COMMUNITY_MEMBER_REPOSITORY_PORT,
    CommunityMemberRepository
} from '../domain/ports/out/community-member.repository';
import {
    FILE_STORAGE_PORT,
    FileStoragePort
} from 'src/shared/infrastructure/file-storage/file-storage.port';

@Injectable()
export class DeleteCommunityService implements DeleteCommunityUseCase {
    constructor(
        @Inject(COMMUNITY_REPOSITORY_PORT)
        private readonly communityRepository: CommunityRepository,
        @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
        private readonly memberRepository: CommunityMemberRepository,
        @Inject(FILE_STORAGE_PORT)
        private readonly fileStorage: FileStoragePort
    ) { }

    async execute(userId: string, communityId: string): Promise<void> {
        // Obtener la comunidad
        const community = await this.communityRepository.findById(communityId);
        if (!community) {
            throw new NotFoundException('Comunidad no encontrada');
        }

        // Verificar que el usuario es el owner
        const member = await this.memberRepository.findByUserAndCommunity(userId, communityId);
        if (!member || !member.isOwner()) {
            throw new ForbiddenException('Solo el owner puede eliminar la comunidad');
        }

        // Eliminar imágenes si existen
        if (community.getAvatarUrl()) {
            try {
                await this.fileStorage.deleteFile(community.getAvatarUrl()!);
            } catch (error) {
                console.warn('Error eliminando avatar:', error);
            }
        }

        if (community.getBannerUrl()) {
            try {
                await this.fileStorage.deleteFile(community.getBannerUrl()!);
            } catch (error) {
                console.warn('Error eliminando banner:', error);
            }
        }

        // Eliminar la comunidad (las relaciones se eliminan en cascada por la BD)
        await this.communityRepository.delete(communityId);
    }
}
