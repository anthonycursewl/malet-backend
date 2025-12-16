import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ManageMembersUseCase } from '../domain/ports/in/manage-members.usecase';
import {
    COMMUNITY_REPOSITORY_PORT,
    CommunityRepository
} from '../domain/ports/out/community.repository';
import {
    COMMUNITY_MEMBER_REPOSITORY_PORT,
    CommunityMemberRepository
} from '../domain/ports/out/community-member.repository';
import { CommunityMember } from '../domain/entities/community-member.entity';
import { MemberRole } from '../domain/enums/member-role.enum';
import { MembershipStatus } from '../domain/enums/membership-status.enum';

@Injectable()
export class ManageMembersService implements ManageMembersUseCase {
    constructor(
        @Inject(COMMUNITY_REPOSITORY_PORT)
        private readonly communityRepository: CommunityRepository,
        @Inject(COMMUNITY_MEMBER_REPOSITORY_PORT)
        private readonly memberRepository: CommunityMemberRepository
    ) { }

    /**
     * Verifica que el solicitante tiene permisos para gestionar miembros
     */
    private async verifyRequesterPermissions(requesterId: string, communityId: string): Promise<CommunityMember> {
        const requesterMember = await this.memberRepository.findByUserAndCommunity(requesterId, communityId);

        if (!requesterMember) {
            throw new ForbiddenException('No eres miembro de esta comunidad');
        }

        if (!requesterMember.canManageMembers()) {
            throw new ForbiddenException('No tienes permisos para gestionar miembros');
        }

        return requesterMember;
    }

    /**
     * Obtiene un miembro y verifica que existe
     */
    private async getMemberOrFail(memberId: string): Promise<CommunityMember> {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new NotFoundException('Miembro no encontrado');
        }
        return member;
    }

    async approveMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember> {
        await this.verifyRequesterPermissions(requesterId, communityId);

        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        if (!member.isPending()) {
            throw new ForbiddenException('El miembro no tiene una solicitud pendiente');
        }

        const updatedMember = await this.memberRepository.updateStatus(memberId, MembershipStatus.ACTIVE);

        // Incrementar contador de miembros
        await this.communityRepository.incrementMemberCount(communityId);

        return updatedMember;
    }

    async rejectMember(requesterId: string, communityId: string, memberId: string): Promise<void> {
        await this.verifyRequesterPermissions(requesterId, communityId);

        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        if (!member.isPending()) {
            throw new ForbiddenException('El miembro no tiene una solicitud pendiente');
        }

        // Eliminar la solicitud
        await this.memberRepository.delete(memberId);
    }

    async kickMember(requesterId: string, communityId: string, memberId: string): Promise<void> {
        const requester = await this.verifyRequesterPermissions(requesterId, communityId);
        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        // No se puede expulsar al owner
        if (member.isOwner()) {
            throw new ForbiddenException('No puedes expulsar al owner de la comunidad');
        }

        // Un admin no puede expulsar a otro admin (solo el owner puede)
        if (member.isAdmin() && !requester.isOwner()) {
            throw new ForbiddenException('Solo el owner puede expulsar administradores');
        }

        const wasActive = member.isActive();

        // Eliminar membresía
        await this.memberRepository.delete(memberId);

        // Decrementar contador si estaba activo
        if (wasActive) {
            await this.communityRepository.decrementMemberCount(communityId);
        }
    }

    async banMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember> {
        const requester = await this.verifyRequesterPermissions(requesterId, communityId);
        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        // No se puede banear al owner
        if (member.isOwner()) {
            throw new ForbiddenException('No puedes banear al owner de la comunidad');
        }

        // Un admin no puede banear a otro admin
        if (member.isAdmin() && !requester.isOwner()) {
            throw new ForbiddenException('Solo el owner puede banear administradores');
        }

        const wasActive = member.isActive();

        const bannedMember = await this.memberRepository.updateStatus(memberId, MembershipStatus.BANNED);

        // Decrementar contador si estaba activo
        if (wasActive) {
            await this.communityRepository.decrementMemberCount(communityId);
        }

        return bannedMember;
    }

    async unbanMember(requesterId: string, communityId: string, memberId: string): Promise<CommunityMember> {
        await this.verifyRequesterPermissions(requesterId, communityId);
        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        if (!member.isBanned()) {
            throw new ForbiddenException('El miembro no está baneado');
        }

        const unbannedMember = await this.memberRepository.updateStatus(memberId, MembershipStatus.ACTIVE);

        // Incrementar contador
        await this.communityRepository.incrementMemberCount(communityId);

        return unbannedMember;
    }

    async changeRole(requesterId: string, communityId: string, memberId: string, newRole: MemberRole): Promise<CommunityMember> {
        const requester = await this.memberRepository.findByUserAndCommunity(requesterId, communityId);

        if (!requester) {
            throw new ForbiddenException('No eres miembro de esta comunidad');
        }

        // Solo el owner puede cambiar roles
        if (!requester.isOwner()) {
            throw new ForbiddenException('Solo el owner puede cambiar roles de miembros');
        }

        const member = await this.getMemberOrFail(memberId);

        if (member.getCommunityId() !== communityId) {
            throw new ForbiddenException('El miembro no pertenece a esta comunidad');
        }

        // No se puede cambiar el rol del owner
        if (member.isOwner()) {
            throw new ForbiddenException('No puedes cambiar el rol del owner');
        }

        // No se puede asignar el rol de owner mediante este método
        if (newRole === MemberRole.OWNER) {
            throw new ForbiddenException('Para transferir ownership usa el método específico');
        }

        return this.memberRepository.updateRole(memberId, newRole);
    }

    async getPendingMembers(requesterId: string, communityId: string): Promise<CommunityMember[]> {
        await this.verifyRequesterPermissions(requesterId, communityId);
        return this.memberRepository.findPendingByCommunityId(communityId);
    }

    async getMembers(communityId: string): Promise<CommunityMember[]> {
        // Verificar que la comunidad existe
        const community = await this.communityRepository.findById(communityId);
        if (!community) {
            throw new NotFoundException('Comunidad no encontrada');
        }

        return this.memberRepository.findActiveByCommunityId(communityId);
    }
}
