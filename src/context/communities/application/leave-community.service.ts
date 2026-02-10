import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { LeaveCommunityUseCase } from '../domain/ports/in/leave-community.usecase';
import {
  COMMUNITY_REPOSITORY_PORT,
  CommunityRepository,
} from '../domain/ports/out/community.repository';
import {
  COMMUNITY_MEMBER_REPOSITORY_PORT,
  CommunityMemberRepository,
} from '../domain/ports/out/community-member.repository';

@Injectable()
export class LeaveCommunityService implements LeaveCommunityUseCase {
  constructor(
    @Inject(COMMUNITY_REPOSITORY_PORT)
    private readonly communityRepository: CommunityRepository,
    @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
    private readonly memberRepository: CommunityMemberRepository,
  ) {}

  async execute(userId: string, communityId: string): Promise<void> {
    // Verificar que la comunidad existe
    const community = await this.communityRepository.findById(communityId);
    if (!community) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    // Buscar la membresía del usuario
    const member = await this.memberRepository.findByUserAndCommunity(
      userId,
      communityId,
    );
    if (!member) {
      throw new NotFoundException('No eres miembro de esta comunidad');
    }

    // El owner no puede abandonar la comunidad
    if (member.isOwner()) {
      throw new ForbiddenException(
        'El owner no puede abandonar la comunidad. Debes transferir el ownership primero o eliminar la comunidad.',
      );
    }

    // Verificar si estaba activo para decrementar contador
    const wasActive = member.isActive();

    // Eliminar la membresía
    await this.memberRepository.delete(member.getId());

    // Si estaba activo, decrementar contador
    if (wasActive) {
      await this.communityRepository.decrementMemberCount(communityId);
    }
  }
}
