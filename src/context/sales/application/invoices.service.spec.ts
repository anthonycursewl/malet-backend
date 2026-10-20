import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { ReceiptsService } from './receipts.service';
import {
  INVOICE_REPOSITORY_PORT,
  InvoiceRepository,
} from '../domain/ports/out/invoice.repository';
import {
  PRODUCT_REPOSITORY_PORT,
  ProductRepository,
} from '../domain/ports/out/product.repository';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodRepository,
} from '../domain/ports/out/payment-method.repository';
import {
  SALE_REPOSITORY_PORT,
  SaleRepository,
} from '../domain/ports/out/sale.repository';
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
import { STORE_NOTIFICATIONS_USECASE } from '../domain/ports/in/store-notifications.usecase';
import { Invoice } from '../domain/entities/invoice.entity';
import { Sale } from '../domain/entities/sale.entity';
import { Receipt } from '../domain/entities/receipt.entity';
import { Store } from '../domain/entities/store.entity';
import { Product } from '../domain/entities/product.entity';
import { PaymentMethod } from '../domain/entities/payment-method.entity';
import { Customer } from '../domain/entities/customer.entity';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepository: jest.Mocked<InvoiceRepository>;
  let productRepository: jest.Mocked<ProductRepository>;
  let paymentMethodRepository: jest.Mocked<PaymentMethodRepository>;
  let saleRepository: jest.Mocked<SaleRepository>;
  let receiptRepository: jest.Mocked<ReceiptRepository>;
  let storeRepository: jest.Mocked<StoreRepository>;
  let customersUseCase: jest.Mocked<CustomersUseCase>;
  let receiptsService: { buildReceipt: jest.Mock };

  const store = Store.create({
    name: 'Estudio',
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

  const cashMethod = PaymentMethod.create({
    store_id: store.getId(),
    name: 'Efectivo',
    created_by: 'owner-1',
  });

  const customer = Customer.create({
    name: 'Ana',
    created_by: 'owner-1',
  });

  const makeInvoice = (): Invoice =>
    Invoice.create({
      store_id: store.getId(),
      customer_id: customer.getId(),
      customer_name: customer.getName(),
      sequence: 1,
      year: 2026,
      currency: 'Bs',
      issued_at: new Date('2026-03-15T10:00:00.000Z'),
      lines: [
        {
          product_id: product.getId(),
          name: 'Café',
          item_type: 'product',
          quantity: 2,
          unit_price: 5,
          unit_cost: 2,
        },
        {
          product_id: null,
          name: 'Desarrollo de app',
          item_type: 'service',
          quantity: 1,
          unit_price: 500,
          unit_cost: 100,
        },
      ],
      created_by: 'seller-1',
    });

  const buildReceipt = (sale: Sale): Receipt =>
    Receipt.create({
      store_id: store.getId(),
      sale_id: sale.getId(),
      sequence: 1,
      year: 2026,
      customer_name: customer.getName(),
      currency: 'Bs',
      lines: sale.getItems().map((item) => ({
        product_id: item.getProductId(),
        product_name: item.getName(),
        quantity: item.getQuantity(),
        unit_price: item.getUnitPrice(),
        unit_cost: item.getUnitCost(),
        total: item.getTotal(),
      })),
      payments: [
        {
          payment_method_id: sale.getPaymentMethodId(),
          payment_method_name: 'Efectivo',
          amount: sale.getTotal(),
          paid_at: new Date('2026-03-20T10:00:00.000Z').toISOString(),
        },
      ],
      issued_at: new Date('2026-03-20T10:00:00.000Z'),
      created_by: 'seller-1',
    });

  beforeEach(async () => {
    invoiceRepository = {
      save: jest.fn().mockImplementation(async (invoice: Invoice) => invoice),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockImplementation(async (invoice: Invoice) => invoice),
      markPaid: jest
        .fn()
        .mockImplementation(async (invoice: Invoice) => invoice),
      reserveNextSequence: jest.fn().mockResolvedValue(7),
      getTotals: jest.fn(),
    } as any;

    productRepository = {
      findById: jest.fn().mockResolvedValue(product),
      findManyByIds: jest.fn().mockResolvedValue([product]),
    } as any;

    paymentMethodRepository = {
      findById: jest.fn().mockResolvedValue(cashMethod),
    } as any;

    saleRepository = {
      save: jest.fn().mockImplementation(async (sale: Sale) => sale),
      hardDelete: jest.fn().mockResolvedValue(undefined),
    } as any;

    receiptRepository = {
      save: jest.fn().mockImplementation(async (receipt: Receipt) => receipt),
      hardDelete: jest.fn().mockResolvedValue(undefined),
    } as any;

    storeRepository = {
      findById: jest.fn().mockResolvedValue(store),
    } as any;

    customersUseCase = {
      assertLinked: jest.fn().mockResolvedValue(customer),
    } as any;

    receiptsService = {
      buildReceipt: jest
        .fn()
        .mockImplementation(async (_storeId, sale: Sale) => buildReceipt(sale)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: ReceiptsService, useValue: receiptsService },
        { provide: INVOICE_REPOSITORY_PORT, useValue: invoiceRepository },
        { provide: PRODUCT_REPOSITORY_PORT, useValue: productRepository },
        {
          provide: PAYMENT_METHOD_REPOSITORY_PORT,
          useValue: paymentMethodRepository,
        },
        { provide: SALE_REPOSITORY_PORT, useValue: saleRepository },
        { provide: STORE_REPOSITORY_PORT, useValue: storeRepository },
        { provide: RECEIPT_REPOSITORY_PORT, useValue: receiptRepository },
        { provide: CUSTOMERS_USECASE, useValue: customersUseCase },
        {
          provide: STORE_NOTIFICATIONS_USECASE,
          useValue: { notify: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    it('mixes products and free services with a snapshot and its own folio', async () => {
      const invoice = await service.create(store.getId(), 'seller-1', {
        items: [
          { product_id: product.getId(), quantity: 2 },
          {
            name: 'Desarrollo de app',
            unit_price: 500,
            unit_cost: 100,
            quantity: 1,
          },
        ],
        customer_id: customer.getId(),
        issued_at: '2026-03-15T10:00:00.000Z',
      });

      expect(invoice.getNumber()).toBe('F-BRD-2026-000007');
      expect(invoice.getStatus()).toBe('pending');
      expect(invoice.getTotal()).toBe(510);
      expect(invoice.getCustomerId()).toBe(customer.getId());
      expect(invoice.getCustomerName()).toBe('Ana');
      expect(invoiceRepository.reserveNextSequence).toHaveBeenCalledWith(2026);

      const [productLine, serviceLine] = invoice.getLines();
      expect(productLine).toMatchObject({
        product_id: product.getId(),
        name: 'Café',
        item_type: 'product',
        total: 10,
      });
      expect(serviceLine).toMatchObject({
        product_id: null,
        name: 'Desarrollo de app',
        item_type: 'service',
        quantity: 1,
        unit_price: 500,
        total: 500,
      });
    });

    it('rejects a free concept without a price', async () => {
      await expect(
        service.create(store.getId(), 'seller-1', {
          items: [{ name: 'Consultoría' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('replaces the lines and recomputes the total while pending', async () => {
      const invoice = makeInvoice();
      invoiceRepository.findById.mockResolvedValue(invoice);

      const updated = await service.update(store.getId(), invoice.getId(), {
        items: [{ name: 'Landing page', unit_price: 300 }],
      });

      expect(updated.getTotal()).toBe(300);
      expect(updated.getLines()).toHaveLength(1);
      expect(updated.getLines()[0].name).toBe('Landing page');
    });

    it('rejects editing a paid invoice', async () => {
      const paid = makeInvoice().pay({
        payment_method_id: null,
        paid_at: new Date(),
        sale_id: 'sale-1',
        receipt_id: 'receipt-1',
      });
      invoiceRepository.findById.mockResolvedValue(paid);

      await expect(
        service.update(store.getId(), paid.getId(), {
          items: [{ name: 'Otro', unit_price: 1 }],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending invoice without creating a sale', async () => {
      const invoice = makeInvoice();
      invoiceRepository.findById.mockResolvedValue(invoice);

      const cancelled = await service.cancel(
        store.getId(),
        invoice.getId(),
        'seller-1',
      );

      expect(cancelled.getStatus()).toBe('cancelled');
      expect(saleRepository.save).not.toHaveBeenCalled();
    });

    it('rejects cancelling a paid invoice', async () => {
      const paid = makeInvoice().pay({
        payment_method_id: null,
        paid_at: new Date(),
        sale_id: 'sale-1',
        receipt_id: 'receipt-1',
      });
      invoiceRepository.findById.mockResolvedValue(paid);

      await expect(
        service.cancel(store.getId(), paid.getId(), 'seller-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('pay', () => {
    it('creates the sale and the receipt, then marks the invoice as paid', async () => {
      const invoice = makeInvoice();
      invoiceRepository.findById.mockResolvedValue(invoice);

      const result = await service.pay(
        store.getId(),
        invoice.getId(),
        'seller-1',
        {
          payment_method_id: cashMethod.getId(),
          paid_at: '2026-03-20T10:00:00.000Z',
        },
      );

      expect(result.invoice.getStatus()).toBe('paid');
      expect(result.invoice.getSaleId()).toBe(result.sale.getId());
      expect(result.invoice.getReceiptId()).toBe(result.receipt.getId());
      expect(result.sale.getTotal()).toBe(510);
      expect(result.sale.getSoldAt()).toEqual(
        new Date('2026-03-20T10:00:00.000Z'),
      );
      expect(result.receipt.getNumber()).toContain('R-BRD-2026');
      expect(receiptRepository.save).toHaveBeenCalled();
    });

    it('turns a product deleted after invoicing into a free concept', async () => {
      const invoice = makeInvoice();
      invoiceRepository.findById.mockResolvedValue(invoice);
      // The product no longer exists when the invoice is paid.
      productRepository.findManyByIds.mockResolvedValue([]);

      const result = await service.pay(
        store.getId(),
        invoice.getId(),
        'seller-1',
        {},
      );

      const [line] = result.sale.getItems();
      expect(line.getProductId()).toBeNull();
      expect(line.getItemType()).toBe('service');
      expect(line.getName()).toBe('Café');
      expect(line.getUnitPrice()).toBe(5);
      expect(result.sale.getTotal()).toBe(510);
    });

    it('compensates the sale and receipt when another request paid first', async () => {
      const invoice = makeInvoice();
      invoiceRepository.findById.mockResolvedValue(invoice);
      invoiceRepository.markPaid.mockResolvedValue(null);

      await expect(
        service.pay(store.getId(), invoice.getId(), 'seller-1', {}),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(saleRepository.hardDelete).toHaveBeenCalled();
      expect(receiptRepository.hardDelete).toHaveBeenCalled();
    });

    it('rejects paying an already paid invoice', async () => {
      const paid = makeInvoice().pay({
        payment_method_id: null,
        paid_at: new Date(),
        sale_id: 'sale-1',
        receipt_id: 'receipt-1',
      });
      invoiceRepository.findById.mockResolvedValue(paid);

      await expect(
        service.pay(store.getId(), paid.getId(), 'seller-1', {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('rejects deleting a paid invoice', async () => {
      const paid = makeInvoice().pay({
        payment_method_id: null,
        paid_at: new Date(),
        sale_id: 'sale-1',
        receipt_id: 'receipt-1',
      });
      invoiceRepository.findById.mockResolvedValue(paid);

      await expect(
        service.softDelete(store.getId(), paid.getId()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      invoiceRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById(store.getId(), 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
