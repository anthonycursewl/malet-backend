import { Community } from '../../entities/community.entity';
import { CommunityType } from '../../enums/community-type.enum';

export const UPDATE_COMMUNITY_USECASE = 'UPDATE_COMMUNITY_USECASE';

/**
 * Parámetros para actualizar una comunidad
 */
export interface UpdateCommunityParams {
    name?: string;
    description?: string;
    type?: CommunityType;
    avatarFile?: Express.Multer.File;
    bannerFile?: Express.Multer.File;
    isActive?: boolean;
}

/**
 * Puerto de entrada para actualizar una comunidad
 */
export interface UpdateCommunityUseCase {
    execute(userId: string, communityId: string, params: UpdateCommunityParams): Promise<Community>;
}
