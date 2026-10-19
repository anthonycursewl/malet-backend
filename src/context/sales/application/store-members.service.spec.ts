import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StoreMembersService } from './store-members.service';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import { STORE_NOTIFICATIONS_USECASE } from '../domain/ports/in/store-notifications.usecase';
import { StoreMember } from '../domain/entities/store-member.entity';
import { Store } from '../domain/entities/store.entity';

describe('StoreMembersService', () => {
  let service: StoreMembersService;
  let repository: jest.Mocked<StoreRepository>;

  const ownerStore = Store.create({
    name: 'Panadería',
    user_id: 'owner-1',
    currency: 'Bs',
  });

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(ownerStore),
      userExists: jest.fn().mockResolvedValue(true),
      findMemberByUser: jest.fn().mockResolvedValue(null),
      findMemberById: jest.fn(),
      findMemberSummaries: jest.fn().mockResolvedValue([]),
      saveMember: jest.fn().mockImplementation(async (m: StoreMember) => m),
      restoreMember: jest.fn(),
      deleteMember: jest.fn(),
      hardDeleteMember: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreMembersService,
        { provide: STORE_REPOSITORY_PORT, useValue: repository },
        {
          provide: STORE_NOTIFICATIONS_USECASE,
          useValue: { notify: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<StoreMembersService>(StoreMembersService);
  });

  describe('list', () => {
    it('passes the keyset options down to the repository', async () => {
      await service.list('store-1', {
        store_id: 'store-1',
        take: 20,
        cursor: 5,
      });

      expect(repository.findMemberSummaries).toHaveBeenCalledWith({
        store_id: 'store-1',
        take: 20,
        cursor: 5,
      });
    });
  });

  describe('add', () => {
    it('throws NotFoundException when the store does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.add('store-1', 'user-1', { user_id: 'user-2' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      repository.userExists.mockResolvedValue(false);

      await expect(
        service.add('store-1', 'user-1', { user_id: 'ghost' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.saveMember).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the user is already an active member', async () => {
      repository.findMemberByUser.mockResolvedValue(
        StoreMember.create({
          store_id: 'store-1',
          user_id: 'user-2',
          created_by: 'user-1',
        }),
      );

      await expect(
        service.add('store-1', 'user-1', { user_id: 'user-2' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('restores a previously removed membership instead of duplicating it', async () => {
      const removed = StoreMember.fromPrimitives({
        ...StoreMember.create({
          store_id: 'store-1',
          user_id: 'user-2',
          created_by: 'user-1',
        }).toPrimitives(),
        deleted_at: new Date(),
      });
      repository.findMemberByUser.mockResolvedValue(removed);
      repository.restoreMember.mockResolvedValue(removed);

      await service.add('store-1', 'user-1', { user_id: 'user-2' });

      expect(repository.restoreMember).toHaveBeenCalledWith(removed.getId());
      expect(repository.saveMember).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('never allows removing the store owner', async () => {
      const ownerMember = StoreMember.create({
        store_id: ownerStore.getId(),
        user_id: 'owner-1',
        created_by: 'owner-1',
      });
      repository.findMemberById.mockResolvedValue(ownerMember);

      await expect(
        service.softDelete(ownerStore.getId(), ownerMember.getId()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.deleteMember).not.toHaveBeenCalled();
    });

    it('removes a regular member', async () => {
      const member = StoreMember.create({
        store_id: ownerStore.getId(),
        user_id: 'user-2',
        created_by: 'owner-1',
      });
      repository.findMemberById.mockResolvedValue(member);
      repository.deleteMember.mockResolvedValue(member);

      await service.softDelete(ownerStore.getId(), member.getId());

      expect(repository.deleteMember).toHaveBeenCalledWith(member.getId());
    });
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user did not add the member', async () => {
      const member = StoreMember.create({
        store_id: ownerStore.getId(),
        user_id: 'user-2',
        created_by: 'owner-1',
      });
      repository.findMemberById.mockResolvedValue(member);

      await expect(
        service.hardDelete(ownerStore.getId(), member.getId(), 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.hardDeleteMember).not.toHaveBeenCalled();
    });

    it('deletes permanently when the creator asks', async () => {
      const member = StoreMember.create({
        store_id: ownerStore.getId(),
        user_id: 'user-2',
        created_by: 'owner-1',
      });
      repository.findMemberById.mockResolvedValue(member);

      await service.hardDelete(ownerStore.getId(), member.getId(), 'owner-1');

      expect(repository.hardDeleteMember).toHaveBeenCalledWith(member.getId());
    });
  });
});
