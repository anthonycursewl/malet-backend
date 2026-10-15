import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { StoreInvitesService } from './store-invites.service';
import {
  STORE_INVITE_REPOSITORY_PORT,
  StoreInviteRepository,
} from '../domain/ports/out/store-invite.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import {
  STORE_MEMBERS_USECASE,
  StoreMembersUseCase,
} from '../domain/ports/in/store-members.usecase';
import { StoreInvite } from '../domain/entities/store-invite.entity';
import { Store } from '../domain/entities/store.entity';
import { StoreMember } from '../domain/entities/store-member.entity';
import { STORE_INVITE_QR_PREFIX, sha256 } from '../domain/invite-token';

describe('StoreInvitesService', () => {
  let service: StoreInvitesService;
  let inviteRepository: jest.Mocked<StoreInviteRepository>;
  let storeRepository: jest.Mocked<StoreRepository>;
  let membersUseCase: jest.Mocked<StoreMembersUseCase>;

  const ownerStore = Store.create({
    name: 'Panadería',
    user_id: 'owner-1',
    currency: 'Bs',
  });

  const activeInvite = StoreInvite.create({
    store_id: ownerStore.getId(),
    created_by: 'owner-1',
    token_hash: sha256('a'.repeat(43)),
    ttl_ms: 60_000,
  });

  const inviteMember = StoreMember.create({
    store_id: ownerStore.getId(),
    user_id: 'scanner-1',
    created_by: 'owner-1',
  });

  beforeEach(async () => {
    inviteRepository = {
      save: jest.fn().mockImplementation(async (invite: StoreInvite) => invite),
      findInviteByTokenHash: jest.fn(),
      revokeActiveInvites: jest.fn().mockResolvedValue(0),
      claimInvite: jest.fn().mockResolvedValue(true),
      releaseClaim: jest.fn().mockResolvedValue(undefined),
    } as any;

    storeRepository = {
      findById: jest.fn().mockResolvedValue(ownerStore),
      findUserSummary: jest.fn().mockResolvedValue({
        id: 'owner-1',
        name: 'Dueño',
        avatar_url: null,
      }),
    } as any;

    membersUseCase = {
      add: jest.fn().mockResolvedValue(inviteMember),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreInvitesService,
        {
          provide: STORE_INVITE_REPOSITORY_PORT,
          useValue: inviteRepository,
        },
        { provide: STORE_REPOSITORY_PORT, useValue: storeRepository },
        { provide: STORE_MEMBERS_USECASE, useValue: membersUseCase },
      ],
    }).compile();

    service = module.get<StoreInvitesService>(StoreInvitesService);
  });

  describe('generate', () => {
    it('only the store owner can generate a QR invitation', async () => {
      await expect(
        service.generate(ownerStore.getId(), 'intruder'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(inviteRepository.save).not.toHaveBeenCalled();
    });

    it('rotates the previous code and stores only the token hash', async () => {
      const result = await service.generate(ownerStore.getId(), 'owner-1');

      expect(inviteRepository.revokeActiveInvites).toHaveBeenCalledWith(
        ownerStore.getId(),
      );
      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.qr_payload).toBe(
        `${STORE_INVITE_QR_PREFIX}${result.token}`,
      );
      expect(result.expires_at.getTime()).toBeGreaterThan(Date.now());

      const saved = inviteRepository.save.mock.calls[0][0];
      expect(saved.getTokenHash()).toBe(sha256(result.token));
      expect(saved.getTokenHash()).not.toBe(result.token);
    });

    it('throws NotFoundException when the store does not exist', async () => {
      storeRepository.findById.mockResolvedValue(null);

      await expect(
        service.generate('missing-store', 'owner-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('preview', () => {
    it('returns the store and inviter for a valid token', async () => {
      inviteRepository.findInviteByTokenHash.mockResolvedValue(activeInvite);

      const preview = await service.preview(
        `${STORE_INVITE_QR_PREFIX}${'a'.repeat(43)}`,
      );

      expect(inviteRepository.findInviteByTokenHash).toHaveBeenCalledWith(
        sha256('a'.repeat(43)),
      );
      expect(preview.store).toEqual({
        id: ownerStore.getId(),
        name: 'Panadería',
      });
      expect(preview.inviter).toEqual({
        id: 'owner-1',
        name: 'Dueño',
        avatar_url: null,
      });
    });

    it('throws NotFoundException for unknown or malformed tokens without querying', async () => {
      await expect(service.preview('not-a-token')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(inviteRepository.findInviteByTokenHash).not.toHaveBeenCalled();
    });

    it('throws GoneException when the token is expired', async () => {
      const expired = StoreInvite.fromPrimitives({
        ...activeInvite.toPrimitives(),
        expires_at: new Date(Date.now() - 1000),
      });
      inviteRepository.findInviteByTokenHash.mockResolvedValue(expired);

      await expect(service.preview('a'.repeat(43))).rejects.toBeInstanceOf(
        GoneException,
      );
    });

    it('throws GoneException when the token was already used', async () => {
      const used = StoreInvite.fromPrimitives({
        ...activeInvite.toPrimitives(),
        used_at: new Date(),
      });
      inviteRepository.findInviteByTokenHash.mockResolvedValue(used);

      await expect(service.preview('a'.repeat(43))).rejects.toBeInstanceOf(
        GoneException,
      );
    });
  });

  describe('accept', () => {
    it('claims the token and joins the store on behalf of the scanner', async () => {
      inviteRepository.findInviteByTokenHash.mockResolvedValue(activeInvite);

      const member = await service.accept('a'.repeat(43), 'scanner-1');

      expect(inviteRepository.claimInvite).toHaveBeenCalledWith(
        activeInvite.getId(),
      );
      expect(membersUseCase.add).toHaveBeenCalledWith(
        ownerStore.getId(),
        'owner-1',
        { user_id: 'scanner-1' },
      );
      expect(inviteRepository.releaseClaim).not.toHaveBeenCalled();
      expect(member.getUserId()).toBe('scanner-1');
    });

    it('throws GoneException when the token was already claimed', async () => {
      inviteRepository.findInviteByTokenHash.mockResolvedValue(activeInvite);
      inviteRepository.claimInvite.mockResolvedValue(false);

      await expect(
        service.accept('a'.repeat(43), 'scanner-1'),
      ).rejects.toBeInstanceOf(GoneException);
      expect(membersUseCase.add).not.toHaveBeenCalled();
    });

    it('releases the claim when joining the store fails', async () => {
      inviteRepository.findInviteByTokenHash.mockResolvedValue(activeInvite);
      membersUseCase.add.mockRejectedValue(
        new NotFoundException('Store not found'),
      );

      await expect(
        service.accept('a'.repeat(43), 'scanner-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(inviteRepository.releaseClaim).toHaveBeenCalledWith(
        activeInvite.getId(),
      );
    });
  });
});
