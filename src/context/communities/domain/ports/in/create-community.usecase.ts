import { Community } from '../../entities/community.entity';
import { CommunityType } from '../../enums/community-type.enum';

export const CREATE_COMMUNITY_USECASE = 'CREATE_COMMUNITY_USECASE';

/**
 * Parámetros para crear una comunidad
 */
export interface CreateCommunityParams {
  name: string;
  description?: string;
  type: CommunityType;
  avatarFile?: Express.Multer.File;
  bannerFile?: Express.Multer.File;
}

/**
 * Puerto de entrada para crear una comunidad
 */
export interface CreateCommunityUseCase {
  execute(userId: string, params: CreateCommunityParams): Promise<Community>;
}
