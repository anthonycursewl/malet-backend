import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import { PaymentMethod } from '../domain/entities/payment-method.entity';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let repository: jest.Mocked<PaymentMethodRepository>;

  const method = PaymentMethod.create({
    store_id: 'store-1',
    name: 'Efectivo',
    created_by: 'creator-1',
  });

  beforeEach(async () => {
    repository = {
      save: jest.fn().mockImplementation(async (m: PaymentMethod) => m),
      findById: jest.fn().mockResolvedValue(method),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(async (m: PaymentMethod) => m),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PAYMENT_METHOD_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
  });

  it('creates the method active by default for the store', async () => {
    const created = await service.create('store-1', 'user-1', {
      name: 'Zelle',
    });

    expect(created.getName()).toBe('Zelle');
    expect(created.isActive()).toBe(true);
    expect(created.getCreatedBy()).toBe('user-1');
  });

  it('throws NotFoundException when the method does not exist in the store', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById('store-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('activates and deactivates through update', async () => {
    await service.update('store-1', method.getId(), { active: false });

    expect(repository.update).toHaveBeenCalledTimes(1);
    const updated = repository.update.mock.calls[0][0];
    expect(updated.isActive()).toBe(false);
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user is not the creator', async () => {
      await expect(
        service.hardDelete('store-1', method.getId(), 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('deletes permanently when the creator asks', async () => {
      await service.hardDelete('store-1', method.getId(), 'creator-1');

      expect(repository.hardDelete).toHaveBeenCalledWith(method.getId());
    });
  });
});
