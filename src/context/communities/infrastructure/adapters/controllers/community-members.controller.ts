import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

// Use Cases
import {
  JOIN_COMMUNITY_USECASE,
  JoinCommunityUseCase,
} from '../../../domain/ports/in/join-community.usecase';
import {
  LEAVE_COMMUNITY_USECASE,
  LeaveCommunityUseCase,
} from '../../../domain/ports/in/leave-community.usecase';
import {
  MANAGE_MEMBERS_USECASE,
  ManageMembersUseCase,
} from '../../../domain/ports/in/manage-members.usecase';

// DTOs
import { ChangeRoleDto } from '../dtos/change-role.dto';

@Controller('communities/:communityId/members')
export class CommunityMembersController {
  constructor(
    @Inject(JOIN_COMMUNITY_USECASE)
    private readonly joinCommunityUseCase: JoinCommunityUseCase,
    @Inject(LEAVE_COMMUNITY_USECASE)
    private readonly leaveCommunityUseCase: LeaveCommunityUseCase,
    @Inject(MANAGE_MEMBERS_USECASE)
    private readonly manageMembersUseCase: ManageMembersUseCase,
  ) {}

  /**
   * Unirse a una comunidad
   * POST /communities/:communityId/members/join
   */
  @Post('join')
  @UseGuards(JwtAuthGuard)
  async join(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
  ) {
    const result = await this.joinCommunityUseCase.execute(
      user.userId,
      communityId,
    );

    return {
      message: result.joined
        ? 'Te has unido a la comunidad exitosamente'
        : 'Tu solicitud ha sido enviada y está pendiente de aprobación',
      member: result.member.toPrimitives(),
      joined: result.joined,
      pending: result.pending,
    };
  }

  /**
   * Abandonar una comunidad
   * POST /communities/:communityId/members/leave
   */
  @Post('leave')
  @UseGuards(JwtAuthGuard)
  async leave(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
  ) {
    await this.leaveCommunityUseCase.execute(user.userId, communityId);

    return {
      message: 'Has abandonado la comunidad exitosamente',
    };
  }

  /**
   * Listar miembros de una comunidad
   * GET /communities/:communityId/members
   */
  @Get()
  async getMembers(@Param('communityId') communityId: string) {
    const members = await this.manageMembersUseCase.getMembers(communityId);

    return {
      members: members.map((m) => m.toPrimitives()),
    };
  }

  /**
   * Listar solicitudes pendientes
   * GET /communities/:communityId/members/pending
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  async getPendingMembers(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
  ) {
    const members = await this.manageMembersUseCase.getPendingMembers(
      user.userId,
      communityId,
    );

    return {
      pending: members.map((m) => m.toPrimitives()),
    };
  }

  /**
   * Aprobar un miembro pendiente
   * PUT /communities/:communityId/members/:memberId/approve
   */
  @Put(':memberId/approve')
  @UseGuards(JwtAuthGuard)
  async approveMember(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    const member = await this.manageMembersUseCase.approveMember(
      user.userId,
      communityId,
      memberId,
    );

    return {
      message: 'Miembro aprobado exitosamente',
      member: member.toPrimitives(),
    };
  }

  /**
   * Rechazar un miembro pendiente
   * PUT /communities/:communityId/members/:memberId/reject
   */
  @Put(':memberId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectMember(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.manageMembersUseCase.rejectMember(
      user.userId,
      communityId,
      memberId,
    );

    return {
      message: 'Solicitud rechazada',
    };
  }

  /**
   * Expulsar un miembro
   * DELETE /communities/:communityId/members/:memberId
   */
  @Delete(':memberId')
  @UseGuards(JwtAuthGuard)
  async kickMember(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.manageMembersUseCase.kickMember(
      user.userId,
      communityId,
      memberId,
    );

    return {
      message: 'Miembro expulsado exitosamente',
    };
  }

  /**
   * Banear un miembro
   * PUT /communities/:communityId/members/:memberId/ban
   */
  @Put(':memberId/ban')
  @UseGuards(JwtAuthGuard)
  async banMember(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    const member = await this.manageMembersUseCase.banMember(
      user.userId,
      communityId,
      memberId,
    );

    return {
      message: 'Miembro baneado exitosamente',
      member: member.toPrimitives(),
    };
  }

  /**
   * Desbanear un miembro
   * PUT /communities/:communityId/members/:memberId/unban
   */
  @Put(':memberId/unban')
  @UseGuards(JwtAuthGuard)
  async unbanMember(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    const member = await this.manageMembersUseCase.unbanMember(
      user.userId,
      communityId,
      memberId,
    );

    return {
      message: 'Miembro desbaneado exitosamente',
      member: member.toPrimitives(),
    };
  }

  /**
   * Cambiar rol de un miembro
   * PUT /communities/:communityId/members/:memberId/role
   */
  @Put(':memberId/role')
  @UseGuards(JwtAuthGuard)
  async changeRole(
    @CurrentUser() user: { userId: string },
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    const member = await this.manageMembersUseCase.changeRole(
      user.userId,
      communityId,
      memberId,
      dto.role,
    );

    return {
      message: 'Rol actualizado exitosamente',
      member: member.toPrimitives(),
    };
  }
}
