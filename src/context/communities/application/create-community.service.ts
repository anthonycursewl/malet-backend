import { Injectable, Inject, ConflictException } from '@nestjs/common';
import {
  CreateCommunityUseCase,
  CreateCommunityParams,
} from '../domain/ports/in/create-community.usecase';
import {
  COMMUNITY_REPOSITORY_PORT,
  CommunityRepository,
} from '../domain/ports/out/community.repository';
import {
  COMMUNITY_MEMBER_REPOSITORY_PORT,
  CommunityMemberRepository,
} from '../domain/ports/out/community-member.repository';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from 'src/shared/infrastructure/file-storage/file-storage.port';
import { Community } from '../domain/entities/community.entity';
import { CommunityMember } from '../domain/entities/community-member.entity';

@Injectable()
export class CreateCommunityService implements CreateCommunityUseCase {
  constructor(
    @Inject(COMMUNITY_REPOSITORY_PORT)
    private readonly communityRepository: CommunityRepository,
    @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
    private readonly memberRepository: CommunityMemberRepository,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(
    userId: string,
    params: CreateCommunityParams,
  ): Promise<Community> {
    // Generar slug único
    let slug = Community.generateSlug(params.name);
    let attempts = 0;
    const maxAttempts = 5;

    while (
      (await this.communityRepository.existsBySlug(slug)) &&
      attempts < maxAttempts
    ) {
      slug = Community.generateSlug(params.name);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new ConflictException(
        'No se pudo generar un slug único para la comunidad',
      );
    }

    // Subir imágenes si las hay
    let avatarUrl: string | null = null;
    let bannerUrl: string | null = null;

    if (params.avatarFile) {
      avatarUrl = await this.fileStorage.uploadFile({
        file: params.avatarFile.buffer,
        fileName: params.avatarFile.originalname,
        mimeType: params.avatarFile.mimetype,
        folder: `communities/${slug}/avatar`,
      });
    }

    if (params.bannerFile) {
      bannerUrl = await this.fileStorage.uploadFile({
        file: params.bannerFile.buffer,
        fileName: params.bannerFile.originalname,
        mimeType: params.bannerFile.mimetype,
        folder: `communities/${slug}/banner`,
      });
    }

    // Crear la comunidad
    const community = Community.create({
      name: params.name,
      description: params.description,
      slug,
      type: params.type,
      avatarUrl,
      bannerUrl,
      ownerId: userId,
    });

    const savedCommunity = await this.communityRepository.save(community);

    // Crear el miembro owner automáticamente
    const ownerMember = CommunityMember.createOwner(
      savedCommunity.getId(),
      userId,
    );
    await this.memberRepository.save(ownerMember);

    return savedCommunity;
  }
}
