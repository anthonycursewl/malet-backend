import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import {
  STORE_REPOSITORY_PORT,
  StoreRepository,
} from '../domain/ports/out/store.repository';
import {
  RECEIPT_REPOSITORY_PORT,
  ReceiptRepository,
} from '../domain/ports/out/receipt.repository';
import {
  CUSTOMERS_USECASE,
  CustomersUseCase,
} from '../domain/ports/in/customers.usecase';
import { ReceiptsService } from './receipts.service';
import { Sale } from '../domain/entities/sale.entity';
import { Receipt } from '../domain/entities/receipt.entity';
import { Customer } from '../domain/entities/customer.entity';
import { Store } from '../domain/entities/store.entity';
import { Product } from '../domain/entities/product.entity';
import { PaymentMethod } from '../domain/entities/payment-method.entity';

describe('SalesService', () => {
  let service: SalesService;
  let saleRepository: jest.Mocked<SaleRepository>;
  let productRepository: jest.Mocked<ProductRepository>;
  let paymentMethodRepository: jest.Mocked<PaymentMethodRepository>;
  let storeRepository: jest.Mocked<StoreRepository>;
  let receiptRepository: jest.Mocked<ReceiptRepository>;
  let customersUseCase: jest.Mocked<CustomersUseCase>;
  let receiptsService: { buildReceipt: jest.Mock };

  const product = Product.create({
    store_id: 'store-1',
    name: 'Café',
    cost: 2,
    pvp: 5,
    created_by: 'creator-1',
  });

  const cashMethod = PaymentMethod.create({
    store_id: 'store-1',
    name: 'Efectivo',
    created_by: 'creator-1',
  });

  beforeEach(async () => {
    saleRepository = {
      save: jest.fn().mockImplementation(async (sale: Sale) => sale),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockImplementation(async (sale: Sale) => sale),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      getSummary: jest.fn(),
      getSeries: jest.fn(),
    } as any;

    productRepository = {
      findById: jest.fn().mockResolvedValue(product),
      findManyByIds: jest.fn().mockResolvedValue([product]),
    } as any;

    paymentMethodRepository = {
      findById: jest.fn().mockResolvedValue(cashMethod),
    } as any;

    storeRepository = {
      findById: jest.fn().mockResolvedValue(null),
    } as any;

    receiptRepository = {
      save: jest.fn().mockImplementation(async (receipt: unknown) => receipt),
      findBySaleId: jest.fn().mockResolvedValue(null),
      reserveNextSequence: jest.fn().mockResolvedValue(1),
    } as any;

    customersUseCase = {
      assertLinked: jest.fn(),
    } as any;

    receiptsService = { buildReceipt: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: ReceiptsService,
          useValue: receiptsService,
        },
        { provide: SALE_REPOSITORY_PORT, useValue: saleRepository },
        { provide: PRODUCT_REPOSITORY_PORT, useValue: productRepository },
        {
          provide: PAYMENT_METHOD_REPOSITORY_PORT,
          useValue: paymentMethodRepository,
        },
        { provide: STORE_REPOSITORY_PORT, useValue: storeRepository },
        { provide: RECEIPT_REPOSITORY_PORT, useValue: receiptRepository },
        { provide: CUSTOMERS_USECASE, useValue: customersUseCase },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe('create', () => {
    it('defaults quantity to 1 and snapshots the product pvp/cost', async () => {
      const { sale } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
        payment_method_id: cashMethod.getId(),
      });

      const [item] = sale.getItems();
      expect(item.getQuantity()).toBe(1);
      expect(item.getUnitPrice()).toBe(5);
      expect(item.getUnitCost()).toBe(2);
      expect(sale.getCreatedBy()).toBe('seller-1');
      expect(sale.getTotal()).toBe(5);
      expect(sale.getProfit()).toBe(3);
    });

    it('accepts an explicit price, cost, quantity and date', async () => {
      const soldAt = new Date('2026-09-01T10:00:00.000Z');
      const { sale } = await service.create('store-1', 'seller-1', {
        items: [
          {
            product_id: product.getId(),
            quantity: 3,
            unit_price: 6,
            unit_cost: 2.5,
          },
        ],
        sold_at: soldAt.toISOString(),
      });

      const [item] = sale.getItems();
      expect(item.getQuantity()).toBe(3);
      expect(item.getUnitPrice()).toBe(6);
      expect(item.getUnitCost()).toBe(2.5);
      expect(sale.getSoldAt()).toEqual(soldAt);
      expect(sale.getTotal()).toBe(18);
      expect(sale.getProfit()).toBe(10.5);
      expect(sale.getPaymentMethodId()).toBeNull();
    });

    it('registers several products in a single sale', async () => {
      const bread = Product.create({
        store_id: 'store-1',
        name: 'Pan',
        cost: 1,
        pvp: 2,
        created_by: 'creator-1',
      });
      productRepository.findById.mockImplementation(
        async (_store_id: string, id: string) =>
          id === bread.getId() ? bread : product,
      );
      productRepository.findManyByIds.mockResolvedValue([product, bread]);

      const { sale } = await service.create('store-1', 'seller-1', {
        items: [
          { product_id: product.getId(), quantity: 2 },
          { product_id: bread.getId(), quantity: 3, unit_price: 2.5 },
        ],
      });

      expect(sale.getItems()).toHaveLength(2);
      expect(sale.getUnits()).toBe(5);
      // 2 × 5 + 3 × 2.5 = 17.5
      expect(sale.getTotal()).toBe(17.5);
      // 2 × (5 - 2) + 3 × (2.5 - 1) = 10.5
      expect(sale.getProfit()).toBe(10.5);
    });

    it('validates the optional customer against the store', async () => {
      const customer = Customer.create({
        name: 'Ana',
        created_by: 'seller-1',
      });
      customersUseCase.assertLinked.mockResolvedValue(customer);

      const { sale } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
        customer_id: customer.getId(),
      });

      expect(customersUseCase.assertLinked).toHaveBeenCalledWith(
        'store-1',
        customer.getId(),
      );
      expect(sale.getCustomerId()).toBe(customer.getId());
    });

    it('throws NotFoundException when the product does not belong to the store', async () => {
      productRepository.findManyByIds.mockResolvedValue([]);

      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: 'other-product' }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(saleRepository.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the payment method is deactivated', async () => {
      paymentMethodRepository.findById.mockResolvedValue(
        cashMethod.update({ active: false }),
      );

      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: product.getId() }],
          payment_method_id: cashMethod.getId(),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('reference currency pair', () => {
    it('stores an informational reference amount with its currency without touching base amounts', async () => {
      const { sale } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
        reference_currency: 'USD',
        reference_amount: 1.5,
      });

      expect(sale.getReferenceCurrency()).toBe('USD');
      expect(sale.getReferenceAmount()).toBe(1.5);
      // The reference never affects the base amounts (store currency).
      expect(sale.getItems()[0].getUnitPrice()).toBe(5);
      expect(sale.getTotal()).toBe(5);
      expect(sale.getProfit()).toBe(3);
    });

    it('defaults to no reference when the pair is omitted', async () => {
      const { sale } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
      });

      expect(sale.getReferenceCurrency()).toBeNull();
      expect(sale.getReferenceAmount()).toBeNull();
    });

    it('rejects sending only one side of the reference pair', async () => {
      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: product.getId() }],
          reference_currency: 'USD',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: product.getId() }],
          reference_amount: 1.5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(saleRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a half-null pair (currency without amount)', async () => {
      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: product.getId() }],
          reference_currency: null,
          reference_amount: 1.5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(saleRepository.save).not.toHaveBeenCalled();
    });

    it('sets and clears the reference on update', async () => {
      const sale = Sale.create({
        store_id: 'store-1',
        items: [
          {
            product_id: product.getId(),
            quantity: 1,
            unit_price: 5,
            unit_cost: 2,
          },
        ],
        sold_at: new Date(),
        created_by: 'seller-1',
      });
      saleRepository.findById.mockResolvedValue(sale);

      const updated = await service.update('store-1', sale.getId(), {
        reference_currency: 'COP',
        reference_amount: 7000,
      });
      expect(updated.getReferenceCurrency()).toBe('COP');
      expect(updated.getReferenceAmount()).toBe(7000);

      const cleared = await service.update('store-1', sale.getId(), {
        reference_currency: null,
        reference_amount: null,
      });
      expect(cleared.getReferenceCurrency()).toBeNull();
      expect(cleared.getReferenceAmount()).toBeNull();
    });

    it('rejects a partial reference update without persisting', async () => {
      const sale = Sale.create({
        store_id: 'store-1',
        items: [
          {
            product_id: product.getId(),
            quantity: 1,
            unit_price: 5,
            unit_cost: 2,
          },
        ],
        sold_at: new Date(),
        created_by: 'seller-1',
      });
      saleRepository.findById.mockResolvedValue(sale);

      await expect(
        service.update('store-1', sale.getId(), { reference_amount: 3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saleRepository.update).not.toHaveBeenCalled();
    });

    it('replaces the cart when items are provided', async () => {
      const sale = Sale.create({
        store_id: 'store-1',
        items: [
          {
            product_id: product.getId(),
            quantity: 1,
            unit_price: 5,
            unit_cost: 2,
          },
        ],
        sold_at: new Date(),
        created_by: 'seller-1',
      });
      saleRepository.findById.mockResolvedValue(sale);
      saleRepository.update.mockImplementation(
        async (updated: Sale) => updated,
      );

      const updated = await service.update('store-1', sale.getId(), {
        items: [{ product_id: product.getId(), quantity: 4 }],
      });

      expect(updated.getItems()).toHaveLength(1);
      expect(updated.getItems()[0].getQuantity()).toBe(4);
      expect(updated.getTotal()).toBe(20);
    });
  });

  describe('receipt policy of the store', () => {
    const storeWithMode = (mode: 'ask' | 'always' | 'never') =>
      Store.create({
        name: 'Panadería',
        user_id: 'owner-1',
        currency: 'Bs',
        receipt_mode: mode,
      });

    it('never issues a receipt when the store policy is `never`', async () => {
      storeRepository.findById.mockResolvedValue(storeWithMode('never'));

      const { receipt } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
        receipt: { enabled: true },
      });

      expect(receipt).toBeNull();
      expect(receiptRepository.save).not.toHaveBeenCalled();
    });

    it('always issues a receipt when the store policy is `always`', async () => {
      storeRepository.findById.mockResolvedValue(storeWithMode('always'));
      const built = Receipt.create({
        store_id: 'store-1',
        sale_id: 'sale-1',
        sequence: 1,
        year: 2026,
        currency: 'Bs',
        lines: [],
        payments: [],
        issued_at: new Date(),
        created_by: 'seller-1',
      });
      receiptsService.buildReceipt.mockResolvedValue(built);

      const { receipt } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
      });

      expect(receipt?.getNumber()).toBe(built.getNumber());
      expect(receiptRepository.save).toHaveBeenCalledTimes(1);
    });

    it('respects the client flag when the store policy is `ask`', async () => {
      storeRepository.findById.mockResolvedValue(storeWithMode('ask'));

      const { receipt } = await service.create('store-1', 'seller-1', {
        items: [{ product_id: product.getId() }],
      });

      expect(receipt).toBeNull();
    });

    it('rolls the sale back when the receipt fails (all-or-nothing)', async () => {
      storeRepository.findById.mockResolvedValue(storeWithMode('always'));
      receiptsService.buildReceipt.mockRejectedValue(new Error('boom'));

      await expect(
        service.create('store-1', 'seller-1', {
          items: [{ product_id: product.getId() }],
        }),
      ).rejects.toThrow('boom');

      expect(saleRepository.hardDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('hardDelete', () => {
    it('throws ForbiddenException when the user did not create the sale', async () => {
      const sale = Sale.create({
        store_id: 'store-1',
        payment_method_id: cashMethod.getId(),
        items: [
          {
            product_id: product.getId(),
            quantity: 1,
            unit_price: 5,
            unit_cost: 2,
          },
        ],
        sold_at: new Date(),
        created_by: 'seller-1',
      });
      saleRepository.findById.mockResolvedValue(sale);

      await expect(
        service.hardDelete('store-1', sale.getId(), 'another-seller'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(saleRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('hard-deletes when the creator requests it', async () => {
      const sale = Sale.create({
        store_id: 'store-1',
        payment_method_id: cashMethod.getId(),
        items: [
          {
            product_id: product.getId(),
            quantity: 1,
            unit_price: 5,
            unit_cost: 2,
          },
        ],
        sold_at: new Date(),
        created_by: 'seller-1',
      });
      saleRepository.findById.mockResolvedValue(sale);
      saleRepository.hardDelete.mockResolvedValue(undefined);

      await service.hardDelete('store-1', sale.getId(), 'seller-1');

      expect(saleRepository.hardDelete).toHaveBeenCalledWith(sale.getId());
    });
  });

  describe('list', () => {
    it('passes resolved date ranges down to the repository', async () => {
      saleRepository.findMany.mockResolvedValue([]);

      await service.list({
        store_id: 'store-1',
        payment_method_id: cashMethod.getId(),
        from: '2026-09-01',
        to: '2026-09-15',
      });

      const options = saleRepository.findMany.mock.calls[0][0];
      expect(options.payment_method_id).toBe(cashMethod.getId());
      expect(options.range).not.toBeNull();
      expect(options.range.from).toEqual(new Date(2026, 8, 1));
      // A date-only `to` includes the whole day (exclusive boundary at midnight).
      expect(options.range.to).toEqual(new Date(2026, 8, 16));
      expect(options.range.inclusive).toBe(false);
    });
  });
});
