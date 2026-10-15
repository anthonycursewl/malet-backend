import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModulesService } from './modules.service';
import {
  USER_MODULE_REPOSITORY_PORT,
  UserModuleRepository,
} from '../domain/ports/out/user-module.repository';
import { UserModule } from '../domain/entities/user-module.entity';
import { ModuleKey } from '../domain/constants';

describe('ModulesService', () => {
  let service: ModulesService;
  let repository: jest.Mocked<UserModuleRepository>;

  beforeEach(async () => {
    repository = {
      findByUserAndKey: jest.fn().mockResolvedValue(null),
      findManyByUser: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation(async (module: UserModule) => module),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: USER_MODULE_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<ModulesService>(ModulesService);
  });

  describe('list', () => {
    it('returns every available module as disabled when the user has no rows', async () => {
      const result = await service.list('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ key: 'gym', enabled: false });
    });

    it('reflects the persisted enabled state', async () => {
      repository.findManyByUser.mockResolvedValue([
        UserModule.create({
          user_id: 'user-1',
          module_key: 'gym',
          enabled: true,
        }),
      ]);

      const result = await service.list('user-1');

      expect(result[0].enabled).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('creates the row the first time a module is enabled', async () => {
      const status = await service.setEnabled('user-1', 'gym', true);

      expect(status.enabled).toBe(true);
      const saved = repository.save.mock.calls[0][0];
      expect(saved.getUserId()).toBe('user-1');
      expect(saved.getModuleKey()).toBe('gym');
      expect(saved.isEnabled()).toBe(true);
    });

    it('disables an already enabled module', async () => {
      repository.findByUserAndKey.mockResolvedValue(
        UserModule.create({
          user_id: 'user-1',
          module_key: 'gym',
          enabled: true,
        }),
      );

      const status = await service.setEnabled('user-1', 'gym', false);

      expect(status.enabled).toBe(false);
    });

    it('rejects an unknown module key', async () => {
      await expect(
        service.setEnabled('user-1', 'unknown' as ModuleKey, true),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertEnabled', () => {
    it('throws ForbiddenException when the module is off', async () => {
      await expect(
        service.assertEnabled('user-1', 'gym'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('passes when the module is enabled', async () => {
      repository.findByUserAndKey.mockResolvedValue(
        UserModule.create({
          user_id: 'user-1',
          module_key: 'gym',
          enabled: true,
        }),
      );

      await expect(
        service.assertEnabled('user-1', 'gym'),
      ).resolves.toBeUndefined();
    });
  });
});
