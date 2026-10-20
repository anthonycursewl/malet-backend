import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreMembersUseCase } from '../domain/ports/in/store-members.usecase';
import { AddMemberDto } from './dtos/add-member.dto';
import { StoreMember } from '../domain/entities/store-member.entity';
import { Store } from '../domain/entities/store.entity';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
  ListMemberSummariesOptions,
  MemberSummary,
} from '../domain/ports/out/store.repository';
import {
  STORE_NOTIFICATIONS_USECASE,
  StoreNotificationsUseCase,
} from '../domain/ports/in/store-notifications.usecase';

@Injectable()
export class StoreMembersService implements StoreMembersUseCase {
  constructor(
    @Inject(STORE_REPOSITORY_PORT)
    private readonly storeRepository: StoreRepository,
    @Inject(STORE_NOTIFICATIONS_USECASE)
    private readonly notifications: StoreNotificationsUseCase,
  ) {}

  async list(
    store_id: string,
    options: ListMemberSummariesOptions,
  ): Promise<MemberSummary[]> {
    return this.storeRepository.findMemberSummaries({
      store_id,
      take: options.take,
      cursor: options.cursor,
    });
  }

  async add(
    store_id: string,
    user_id: string,
    dto: AddMemberDto,
  ): Promise<StoreMember> {
    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const userExists = await this.storeRepository.userExists(dto.user_id);
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.storeRepository.findMemberByUser(
      store_id,
      dto.user_id,
      true,
    );

    if (existing && !existing.isDeleted()) {
      throw new ConflictException(
        'This user is already an active member of the store',
      );
    }

    // The unique (store_id, user_id) constraint means a returning member
    // must be restored instead of inserted again.
    if (existing) {
      return this.storeRepository.restoreMember(existing.getId());
    }

    const member = StoreMember.create({
      store_id,
      user_id: dto.user_id,
      created_by: user_id,
    });
    const saved = await this.storeRepository.saveMember(member);
    await this.notifyMemberChange(
      'member_added',
      store,
      saved.getUserId(),
      user_id,
    );

    return saved;
  }
  async softDelete(store_id: string, member_id: string): Promise<StoreMember> {
    const member = await this.storeRepository.findMemberById(
      store_id,
      member_id,
      true,
    );
    if (!member) {
      throw new NotFoundException('Store member not found');
    }

    const store = await this.storeRepository.findById(store_id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.getUserId() === member.getUserId()) {
      throw new ForbiddenException('The store owner cannot be removed');
    }

    const removed = await this.storeRepository.deleteMember(member_id);
    await this.notifyMemberChange(
      'member_removed',
      store,
      removed.getUserId(),
      store.getUserId(),
    );

    return removed;
  }

  /**
   * Aviso por email de un cambio de miembros. Se dispara sin esperar (`void`):
   * el SMTP no puede frenar ni romper la gestión de miembros.
   */
  private async notifyMemberChange(
    event: 'member_added' | 'member_removed',
    store: Store,
    member_user_id: string,
    actor_id: string | null,
  ): Promise<void> {
    const titles: Record<'member_added' | 'member_removed', string> = {
      member_added: 'Nuevo miembro en la tienda',
      member_removed: 'Miembro eliminado de la tienda',
    };

    let memberName = member_user_id;
    try {
      const summary =
        await this.storeRepository.findUserSummary(member_user_id);
      if (summary?.name) memberName = summary.name;
    } catch {
      // Sin nombre disponible: el aviso se envía igual con el id.
    }

    void this.notifications.notify(store.getId(), event, {
      subject: `${store.getName()} · ${titles[event]}`,
      title: titles[event],
      intro: `${titles[event]}: "${store.getName()}".`,
      actor_id,
      rows: [{ label: 'Miembro', value: memberName }],
      footerNote:
        'Recibes este aviso porque el dueño de la tienda te añadió a los avisos por correo.',
    });
  }

  async restore(store_id: string, member_id: string): Promise<StoreMember> {
    const member = await this.storeRepository.findMemberById(
      store_id,
      member_id,
      true,
    );
    if (!member) {
      throw new NotFoundException('Store member not found');
    }

    return this.storeRepository.restoreMember(member_id);
  }

  async hardDelete(
    store_id: string,
    member_id: string,
    user_id: string,
  ): Promise<void> {
    const member = await this.storeRepository.findMemberById(
      store_id,
      member_id,
      true,
    );
    if (!member) {
      throw new NotFoundException('Store member not found');
    }
    if (member.getCreatedBy() !== user_id) {
      throw new ForbiddenException(
        'Only the creator of this record can permanently delete it',
      );
    }

    return this.storeRepository.hardDeleteMember(member_id);
  }
}
