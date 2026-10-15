import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CUSTOMER_REPOSITORY_PORT,
  CustomerRepository,
} from '../domain/ports/out/customer.repository';
import { Customer } from '../domain/entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<CustomerRepository>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByPhoneForUser: jest.fn().mockResolvedValue(null),
      findLinkedCustomer: jest.fn(),
      isLinked: jest.fn().mockResolvedValue(false),
      link: jest.fn(),
      unlink: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockImplementation(async (customer: Customer) => customer),
      countActiveLinks: jest.fn().mockResolvedValue(1),
      hardDelete: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CUSTOMER_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('creates the customer and links it to the store', async () => {
      repository.save.mockImplementation(
        async (customer: Customer) => customer,
      );

      const result = await service.create('store-1', 'user-1', {
        name: ' Ana ',
      });

      expect(result.linked_existing).toBe(false);
      expect(result.customer.getName()).toBe('Ana');
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('links the existing customer instead of duplicating when the phone matches', async () => {
      const existing = Customer.create({
        name: 'Ana',
        phone: '0414-1234567',
        created_by: 'user-1',
      });
      repository.findByPhoneForUser.mockResolvedValue(existing);

      const result = await service.create('store-2', 'user-1', {
        name: 'Ana',
        phone: '0414-1234567',
      });

      expect(result.linked_existing).toBe(true);
      expect(result.customer.getId()).toBe(existing.getId());
      expect(repository.link).toHaveBeenCalledWith(
        'store-2',
        existing.getId(),
        'user-1',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('link', () => {
    it('shares an existing customer with the store', async () => {
      const customer = Customer.create({ name: 'Ana', created_by: 'user-1' });
      repository.findById.mockResolvedValue(customer);

      const linked = await service.link('store-2', 'user-1', customer.getId());

      expect(linked.getId()).toBe(customer.getId());
      expect(repository.link).toHaveBeenCalledWith(
        'store-2',
        customer.getId(),
        'user-1',
      );
    });

    it('throws ConflictException when it is already linked', async () => {
      const customer = Customer.create({ name: 'Ana', created_by: 'user-1' });
      repository.findById.mockResolvedValue(customer);
      repository.isLinked.mockResolvedValue(true);

      await expect(
        service.link('store-1', 'user-1', customer.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.link).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the customer does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.link('store-1', 'user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when the customer is not linked to the store', async () => {
      repository.findLinkedCustomer.mockResolvedValue(null);

      await expect(
        service.getById('store-1', 'customer-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('hardDelete', () => {
    const customer = Customer.create({ name: 'Ana', created_by: 'user-1' });

    it('throws ForbiddenException when the user is not the creator', async () => {
      repository.findLinkedCustomer.mockResolvedValue(customer);

      await expect(
        service.hardDelete('store-1', customer.getId(), 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when another store still uses the customer', async () => {
      repository.findLinkedCustomer.mockResolvedValue(customer);
      repository.countActiveLinks.mockResolvedValue(2);

      await expect(
        service.hardDelete('store-1', customer.getId(), 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('deletes the identity when the creator asks and only this store uses it', async () => {
      repository.findLinkedCustomer.mockResolvedValue(customer);

      await service.hardDelete('store-1', customer.getId(), 'user-1');

      expect(repository.hardDelete).toHaveBeenCalledWith(customer.getId());
    });
  });

  describe('unlink', () => {
    it('removes the link of this store', async () => {
      const customer = Customer.create({ name: 'Ana', created_by: 'user-1' });
      repository.findLinkedCustomer.mockResolvedValue(customer);

      await service.unlink('store-1', customer.getId());

      expect(repository.unlink).toHaveBeenCalledWith(
        'store-1',
        customer.getId(),
      );
    });
  });

  describe('stats', () => {
    it('requires the customer to be linked before aggregating', async () => {
      repository.findLinkedCustomer.mockResolvedValue(null);

      await expect(
        service.stats('store-1', 'customer-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getStats).not.toHaveBeenCalled();
    });
  });
});
