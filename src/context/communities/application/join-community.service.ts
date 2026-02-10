import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  JoinCommunityUseCase,
  JoinCommunityResult,
} from '../domain/ports/in/join-community.usecase';
import {
  COMMUNITY_REPOSITORY_PORT,
  CommunityRepository,
} from '../domain/ports/out/community.repository';
import {
  COMMUNITY_MEMBER_REPOSITORY_PORT,
  CommunityMemberRepository,
} from '../domain/ports/out/community-member.repository';
import { CommunityMember } from '../domain/entities/community-member.entity';
import { MembershipStatus } from '../domain/enums/membership-status.enum';
import { CommunityType } from '../domain/enums/community-type.enum';

@Injectable()
export class JoinCommunityService implements JoinCommunityUseCase {
  constructor(
    @Inject(COMMUNITY_REPOSITORY_PORT)
    private readonly communityRepository: CommunityRepository,
    @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
    private readonly memberRepository: CommunityMemberRepository,
  ) {}

  async execute(
    userId: string,
    communityId: string,
  ): Promise<JoinCommunityResult> {
    // Verificar que la comunidad existe
    const community = await this.communityRepository.findById(communityId);
    if (!community) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    // Verificar que la comunidad está activa
    if (!community.getIsActive()) {
      throw new ForbiddenException('Esta comunidad no está activa');
    }

    // Verificar que el usuario no sea ya miembro
    const existingMember = await this.memberRepository.findByUserAndCommunity(
      userId,
      communityId,
    );
    if (existingMember) {
      if (existingMember.isBanned()) {
        throw new ForbiddenException('Has sido baneado de esta comunidad');
      }
      if (existingMember.isPending()) {
        throw new ConflictException('Ya tienes una solicitud pendiente');
      }
      if (existingMember.isActive()) {
        throw new ConflictException('Ya eres miembro de esta comunidad');
      }
    }

    // Determinar el estado basado en el tipo de comunidad
    let status: MembershipStatus;

    switch (community.getType()) {
      case CommunityType.PUBLIC:
        status = MembershipStatus.ACTIVE;
        break;
      case CommunityType.PRIVATE:
        status = MembershipStatus.PENDING;
        break;
      case CommunityType.PREMIUM:
        // TODO: Verificar suscripción/pago en el futuro
        status = MembershipStatus.PENDING;
        break;
      default:
        status = MembershipStatus.PENDING;
    }

    // Crear el miembro
    const member = CommunityMember.createMember(communityId, userId, status);
    const savedMember = await this.memberRepository.save(member);

    // Si se unió directamente, incrementar contador
    if (status === MembershipStatus.ACTIVE) {
      await this.communityRepository.incrementMemberCount(communityId);
    }

    return {
      member: savedMember,
      joined: status === MembershipStatus.ACTIVE,
      pending: status === MembershipStatus.PENDING,
    };
  }
}
