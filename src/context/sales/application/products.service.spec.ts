import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import { Product } from '../domain/entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductRepository>;

  const product = Product.create({
    store_id: 'store-1',
    name: 'Café',
    cost: 2,
    pvp: 5,
    created_by: 'creator-1',
  });

  beforeEach(async () => {
    repository = {
      save: jest.fn().mockImplementation(async (p: Product) => p),
      findById: jest.fn().mockResolvedValue(product),
      findManyByIds: jest.fn().mockResolvedValue([product]),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(async (p: Product) => p),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PRODUCT_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('getById', () => {
    it('throws NotFoundException when the product does not exist in the store', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getById('store-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('looks the product up scoped to the store', async () => {
      await service.getById('store-1', product.getId());

      expect(repository.findById).toHaveBeenCalledWith(
        'store-1',
        product.getId(),
        false,
      );
    });
  });

  describe('create', () => {
    it('creates the product for the store with its creator', async () => {
      const created = await service.create('store-1', 'user-1', {
        name: 'Pan',
        cost: 1,
        pvp: 2,
      });

      expect(created.getName()).toBe('Pan');
      expect(created.getStoreId()).toBe('store-1');
      expect(created.getCreatedBy()).toBe('user-1');
      expect(repository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user is not the creator', async () => {
      await expect(
        service.hardDelete('store-1', product.getId(), 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.hardDelete).not.toHaveBeenCalled();
    });

    it('deletes permanently when the creator asks', async () => {
      await service.hardDelete('store-1', product.getId(), 'creator-1');

      expect(repository.hardDelete).toHaveBeenCalledWith(product.getId());
    });
  });

  describe('softDelete / restore', () => {
    it('soft-deletes through the repository', async () => {
      repository.delete.mockResolvedValue(product);

      await service.softDelete('store-1', product.getId());

      expect(repository.delete).toHaveBeenCalledWith(product.getId());
    });

    it('restores including deleted rows', async () => {
      repository.restore.mockResolvedValue(product);

      await service.restore('store-1', product.getId());

      expect(repository.findById).toHaveBeenCalledWith(
        'store-1',
        product.getId(),
        true,
      );
      expect(repository.restore).toHaveBeenCalledWith(product.getId());
    });
  });
});
