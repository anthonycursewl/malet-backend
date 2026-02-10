import { User } from '../../entities/user.entity';

export const UPDATE_USER_PROFILE_USECASE = 'UPDATE_USER_PROFILE_USECASE';

export interface UpdateUserProfileDto {
  userId: string;
  name?: string;
  username?: string;
  avatarFile?: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  };
  bannerFile?: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  };
}

export interface UpdateUserProfileUseCase {
  execute(dto: UpdateUserProfileDto): Promise<User>;
}
