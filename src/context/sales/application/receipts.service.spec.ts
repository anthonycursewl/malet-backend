import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import {
  RECEIPT_REPOSITORY_PORT,
  ReceiptRepository,
} from '../domain/ports/out/receipt.repository';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';
import { STORE_REPOSITORY_PORT } from '../domain/ports/out/store.repository';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import { Receipt } from '../domain/entities/receipt.entity';
import { Sale } from '../domain/entities/sale.entity';
import { Store } from '../domain/entities/store.entity';
import { Product } from '../domain/entities/product.entity';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let receiptRepository: jest.Mocked<ReceiptRepository>;
  let saleRepository: jest.Mocked<SaleRepository>;

  const store = Store.create({
    name: 'Panadería',
    user_id: 'owner-1',
    currency: 'Bs',
  });

  const product = Product.create({
    store_id: store.getId(),
    name: 'Café',
    cost: 2,
    pvp: 5,
    created_by: 'owner-1',
  });

  const sale = Sale.create({
    store_id: store.getId(),
    items: [
      { product_id: product.getId(), quantity: 2, unit_price: 5, unit_cost: 2 },
    ],
    sold_at: new Date('2026-10-15T10:00:00.000Z'),
    created_by: 'seller-1',
  });

  beforeEach(async () => {
    receiptRepository = {
      save: jest.fn().mockImplementation(async (r: Receipt) => r),
      findById: jest.fn(),
      findBySaleId: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn(),
      reserveNextSequence: jest.fn().mockResolvedValue(1),
    } as any;

    saleRepository = {
      findById: jest.fn().mockResolvedValue(sale),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: RECEIPT_REPOSITORY_PORT, useValue: receiptRepository },
        { provide: SALE_REPOSITORY_PORT, useValue: saleRepository },
        {
          provide: STORE_REPOSITORY_PORT,
          useValue: { findById: jest.fn().mockResolvedValue(store) },
        },
        {
          provide: PRODUCT_REPOSITORY_PORT,
          useValue: {
            findById: jest.fn().mockResolvedValue(product),
          } as unknown as ProductRepository,
        },
        {
          provide: PAYMENT_METHOD_REPOSITORY_PORT,
          useValue: {
            findById: jest.fn().mockResolvedValue(null),
          } as unknown as PaymentMethodRepository,
        },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
  });

  describe('issue', () => {
    it('returns the existing receipt without reserving a new folio (idempotent)', async () => {
      const existing = Receipt.create({
        store_id: store.getId(),
        sale_id: sale.getId(),
        sequence: 7,
        year: 2026,
        currency: 'Bs',
        lines: [],
        payments: [],
        issued_at: new Date(),
        created_by: 'seller-1',
      });
      receiptRepository.findBySaleId.mockResolvedValue(existing);

      const result = await service.issue(
        store.getId(),
        sale.getId(),
        'seller-1',
      );

      expect(result.getNumber()).toBe(existing.getNumber());
      expect(receiptRepository.reserveNextSequence).not.toHaveBeenCalled();
      expect(receiptRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the sale does not exist in the store', async () => {
      saleRepository.findById.mockResolvedValue(null);

      await expect(
        service.issue(store.getId(), 'missing', 'seller-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('issues the folio with the Breadriuss format and the line snapshot', async () => {
      const receipt = await service.issue(
        store.getId(),
        sale.getId(),
        'seller-1',
      );

      expect(receipt.getNumber()).toMatch(/^R-BRD-\d{4}-000001$/);
      expect(receipt.getCurrency()).toBe('Bs');
      // Datos del emisor congelados al emitir (inmutables).
      expect(receipt.getStoreName()).toBe('Panadería');
      expect(receipt.getStorePhone()).toBeNull();
      expect(receipt.getTotal()).toBe(10);
      expect(receipt.getLines()).toHaveLength(1);
      expect(receipt.getLines()[0]).toMatchObject({
        product_name: 'Café',
        quantity: 2,
        unit_price: 5,
        total: 10,
      });
    });
  });

  describe('getBySaleId', () => {
    it('throws NotFoundException when the sale has no receipt', async () => {
      receiptRepository.findBySaleId.mockResolvedValue(null);

      await expect(
        service.getBySaleId(store.getId(), sale.getId()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('throws NotFoundException when the receipt does not exist', async () => {
      receiptRepository.findById.mockResolvedValue(null);

      await expect(
        service.softDelete(store.getId(), 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when it is already deleted', async () => {
      const deleted = Receipt.create({
        store_id: store.getId(),
        sale_id: sale.getId(),
        sequence: 1,
        year: 2026,
        currency: 'Bs',
        lines: [],
        payments: [],
        issued_at: new Date(),
        created_by: 'seller-1',
      });
      receiptRepository.findById.mockResolvedValue(
        Receipt.fromPrimitives({
          ...deleted.toPrimitives(),
          deleted_at: new Date(),
        }),
      );

      await expect(
        service.softDelete(store.getId(), deleted.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user is not the creator', async () => {
      const receipt = Receipt.create({
        store_id: store.getId(),
        sale_id: sale.getId(),
        sequence: 1,
        year: 2026,
        currency: 'Bs',
        lines: [],
        payments: [],
        issued_at: new Date(),
        created_by: 'seller-1',
      });
      receiptRepository.findById.mockResolvedValue(receipt);

      await expect(
        service.hardDelete(store.getId(), receipt.getId(), 'other-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(receiptRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('deletes permanently when the creator asks', async () => {
      const receipt = Receipt.create({
        store_id: store.getId(),
        sale_id: sale.getId(),
        sequence: 1,
        year: 2026,
        currency: 'Bs',
        lines: [],
        payments: [],
        issued_at: new Date(),
        created_by: 'seller-1',
      });
      receiptRepository.findById.mockResolvedValue(receipt);

      await service.hardDelete(store.getId(), receipt.getId(), 'seller-1');

      expect(receiptRepository.hardDelete).toHaveBeenCalledWith(
        receipt.getId(),
      );
    });
  });
});
