import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  UpdateUserProfileDto,
  UpdateUserProfileUseCase,
} from '../domain/ports/in/update-user-profile.usecase';
import { User } from '../domain/entities/user.entity';
import {
  USER_REPOSITORY_PORT,
  UserRepository,
} from '../domain/ports/out/user.repository';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from 'src/shared/infrastructure/file-storage/file-storage.port';

@Injectable()
export class UpdateUserProfileService implements UpdateUserProfileUseCase {
  private readonly logger = new Logger(UpdateUserProfileService.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepository,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(dto: UpdateUserProfileDto): Promise<User> {
    try {
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      let avatarUrl = user.getAvatarUrl();
      let bannerUrl = user.getBannerUrl();

      if (dto.avatarFile) {
        if (avatarUrl) {
          await this.fileStorage.deleteFile(avatarUrl);
        }

        avatarUrl = await this.fileStorage.uploadFile({
          file: dto.avatarFile.buffer,
          fileName: dto.avatarFile.fileName,
          mimeType: dto.avatarFile.mimeType,
          folder: 'avatars',
        });
      }

      if (dto.bannerFile) {
        if (bannerUrl) {
          await this.fileStorage.deleteFile(bannerUrl);
        }

        bannerUrl = await this.fileStorage.uploadFile({
          file: dto.bannerFile.buffer,
          fileName: dto.bannerFile.fileName,
          mimeType: dto.bannerFile.mimeType,
          folder: 'banners',
        });
      }

      return this.userRepository.updateProfile({
        userId: dto.userId,
        name: dto.name,
        username: dto.username,
        avatarUrl,
        bannerUrl,
      });
    } catch (error) {
      this.logger.error(
        'Error updating user profile: ' +
          (error instanceof Error ? error.message : String(error)),
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Error al actualizar el perfil del usuario.',
      );
    }
  }
}
