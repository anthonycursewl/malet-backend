import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import { Store } from '../domain/entities/store.entity';
import { StoreMember } from '../domain/entities/store-member.entity';

describe('StoresService', () => {
  let service: StoresService;
  let repository: jest.Mocked<StoreRepository>;

  const ownerStore = Store.create({
    name: 'Mi tienda',
    user_id: 'owner-1',
    currency: 'Bs',
  });
  const ownerMember = StoreMember.create({
    store_id: ownerStore.getId(),
    user_id: 'owner-1',
    created_by: 'owner-1',
  });

  beforeEach(async () => {
    repository = {
      saveWithOwnerMember: jest.fn(),
      findById: jest.fn(),
      findStoresForMember: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn(),
      saveMember: jest.fn(),
      findMemberById: jest.fn(),
      findMembersByStore: jest.fn(),
      findMembership: jest.fn(),
      findMemberByUser: jest.fn(),
      updateMember: jest.fn(),
      deleteMember: jest.fn(),
      restoreMember: jest.fn(),
      hardDeleteMember: jest.fn(),
      countActiveMembers: jest.fn().mockResolvedValue(1),
      userExists: jest.fn(),
      hasSales: jest.fn().mockResolvedValue(false),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: STORE_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
  });

  describe('create', () => {
    it('creates the store and registers the creator as owner member atomically', async () => {
      repository.saveWithOwnerMember.mockImplementation(
        async (store: Store, _member: StoreMember) => store,
      );

      const result = await service.create('owner-1', {
        name: 'Mi tienda',
        currency: 'Bs',
      });

      expect(repository.saveWithOwnerMember).toHaveBeenCalledTimes(1);
      const [storeArg, memberArg] =
        repository.saveWithOwnerMember.mock.calls[0];
      expect(storeArg.getName()).toBe('Mi tienda');
      expect(storeArg.getUserId()).toBe('owner-1');
      expect(storeArg.getCurrency()).toBe('Bs');
      expect(memberArg.getUserId()).toBe('owner-1');
      expect(memberArg.getStoreId()).toBe(storeArg.getId());
      expect(result.getUserId()).toBe('owner-1');
    });
  });

  describe('update currency', () => {
    it('changes the currency when the store has no sales', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.hasSales.mockResolvedValue(false);
      repository.update.mockImplementation(async (store: Store) => store);

      const result = await service.update(ownerStore.getId(), 'owner-1', {
        currency: 'USD',
      });

      expect(repository.hasSales).toHaveBeenCalledWith(ownerStore.getId());
      expect(result.getCurrency()).toBe('USD');
    });

    it('rejects a currency change once the store has sales', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.hasSales.mockResolvedValue(true);

      await expect(
        service.update(ownerStore.getId(), 'owner-1', { currency: 'COP' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not check sales when the currency is not being changed', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.update.mockImplementation(async (store: Store) => store);

      const result = await service.update(ownerStore.getId(), 'owner-1', {
        name: 'Nuevo nombre',
      });

      expect(repository.hasSales).not.toHaveBeenCalled();
      expect(result.getCurrency()).toBe('Bs');
      expect(result.getName()).toBe('Nuevo nombre');
    });
  });

  describe('owner-only settings', () => {
    it('rejects contact info / receipt policy changes from a non-owner member', async () => {
      repository.findById.mockResolvedValue(ownerStore);

      await expect(
        service.update(ownerStore.getId(), 'member-2', {
          receipt_mode: 'always',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.update(ownerStore.getId(), 'member-2', { phone: '+58 414' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lets the owner change the receipt policy and the contact info', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.update.mockImplementation(async (store: Store) => store);

      const result = await service.update(ownerStore.getId(), 'owner-1', {
        receipt_mode: 'never',
        phone: '+58 414-1234567',
        address: 'Calle 1',
      });

      expect(result.getReceiptMode()).toBe('never');
      expect(result.getPhone()).toBe('+58 414-1234567');
      expect(result.getAddress()).toBe('Calle 1');
    });

    it('keeps name and currency editable by any member', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.update.mockImplementation(async (store: Store) => store);

      const result = await service.update(ownerStore.getId(), 'member-2', {
        name: 'Renombrada por miembro',
      });

      expect(result.getName()).toBe('Renombrada por miembro');
    });
  });

  describe('getMemberStore', () => {
    it('throws NotFoundException when the store does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.getMemberStore('store-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when the user is not an active member', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.findMembership.mockResolvedValue(null);

      await expect(
        service.getMemberStore(ownerStore.getId(), 'intruder'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the store for an active member', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.findMembership.mockResolvedValue(ownerMember);

      const result = await service.getMemberStore(
        ownerStore.getId(),
        'owner-1',
      );

      expect(result.getId()).toBe(ownerStore.getId());
    });
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user is not the store owner', async () => {
      repository.findById.mockResolvedValue(ownerStore);

      await expect(
        service.hardDelete(ownerStore.getId(), 'member-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('wipes the store when the owner requests it', async () => {
      repository.findById.mockResolvedValue(ownerStore);
      repository.hardDelete.mockResolvedValue(undefined);

      await service.hardDelete(ownerStore.getId(), 'owner-1');

      expect(repository.hardDelete).toHaveBeenCalledWith(ownerStore.getId());
    });
  });

  describe('restore', () => {
    it('requires an active membership even though the store is deleted', async () => {
      const deletedStore = ownerStore;
      repository.findById.mockResolvedValue(deletedStore);
      repository.findMembership.mockResolvedValue(null);

      await expect(
        service.restore(deletedStore.getId(), 'intruder'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.restore).not.toHaveBeenCalled();
    });
  });
});
