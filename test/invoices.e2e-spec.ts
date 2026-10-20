import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { SalesModule } from './../src/context/sales/sales.module';
import { AuthModule } from './../src/auth/auth.module';
import { CommonModule } from './../src/shared/common/common.module';
import { EmailModule } from './../src/shared/infrastructure/email/email.module';
import { EMAIL_SERVICE_PORT } from './../src/shared/infrastructure/email/email-service.port';
import { PrismaModule } from './../src/prisma.module';
import { PrismaService } from './../src/prisma.service';

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: object, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encoded}.${signature}`;
}

/**
 * e2e de facturas (factura pendiente → pago → venta + recibo) y de los
 * conceptos libres (servicios sin producto), contra la base real.
 */
describe('Invoices (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;

  const secret = 'test-secret-invoices';
  const ownerId = crypto.randomUUID();
  const suffix = ownerId.slice(0, 8);
  let ownerToken: string;

  let storeId: string;
  let productId: string;
  let paymentMethodId: string;
  let customerId: string;
  let invoiceId: string;
  let paidSaleId: string;

  const ownerAuth = () => ({ Authorization: `Bearer ${ownerToken}` });

  const emailSpy = {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'e2e' }),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommonModule,
        PrismaModule,
        AuthModule,
        EmailModule,
        SalesModule,
      ],
    })
      .overrideProvider(EMAIL_SERVICE_PORT)
      .useValue(emailSpy)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    await prisma.user.create({
      data: {
        id: ownerId,
        name: 'Owner invoices e2e',
        username: `e2e_invoices_${suffix}`,
        email: `e2e_invoices_${suffix}@example.test`,
        created_at: new Date(),
      },
    });

    ownerToken = signJwt(
      { sub: ownerId, email: `e2e_invoices_${suffix}@example.test` },
      secret,
    );
  }, 30000);

  afterAll(async () => {
    try {
      if (storeId) {
        // Ejercita el borrado definitivo (incluye las facturas).
        await request(app.getHttpServer())
          .delete(`/stores/${storeId}/hard`)
          .set(ownerAuth());
      }
      if (customerId) {
        await prisma.customers.deleteMany({ where: { id: customerId } });
      }
      await prisma.user.deleteMany({ where: { id: ownerId } });
    } finally {
      await app.close();
    }
  });

  it('prepara tienda, producto, método de pago y cliente', async () => {
    const store = await request(app.getHttpServer())
      .post('/stores')
      .set(ownerAuth())
      .send({ name: `Tienda facturas e2e ${suffix}`, currency: 'USD' })
      .expect(201);
    storeId = store.body.id;
    expect(store.body.currency).toBe('USD');

    const product = await request(app.getHttpServer())
      .post(`/stores/${storeId}/products`)
      .set(ownerAuth())
      .send({ name: 'Café', cost: 2, pvp: 5 })
      .expect(201);
    productId = product.body.id;

    const method = await request(app.getHttpServer())
      .post(`/stores/${storeId}/payment-methods`)
      .set(ownerAuth())
      .send({ name: 'Transferencia' })
      .expect(201);
    paymentMethodId = method.body.id;

    const customer = await request(app.getHttpServer())
      .post(`/stores/${storeId}/customers`)
      .set(ownerAuth())
      .send({ name: 'Ana Factura', phone: `+58${suffix}` })
      .expect(201);
    customerId = customer.body.id;
  });

  it('crea una factura con un producto y un servicio libre', async () => {
    const res = await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices`)
      .set(ownerAuth())
      .send({
        items: [
          { product_id: productId, quantity: 2 },
          {
            name: 'Desarrollo de app',
            unit_price: 500,
            unit_cost: 100,
            quantity: 1,
          },
        ],
        customer_id: customerId,
        notes: 'Proyecto inicial',
      })
      .expect(201);

    invoiceId = res.body.id;
    expect(res.body.number).toMatch(/^F-BRD-\d{4}-\d{6}$/);
    expect(res.body.status).toBe('pending');
    // 2 × 5 + 500 = 510
    expect(res.body.total).toBe(510);
    expect(res.body.customer_name).toBe('Ana Factura');
    expect(res.body.currency).toBe('USD');
    expect(res.body.lines).toHaveLength(2);
    expect(res.body.lines[0]).toMatchObject({
      name: 'Café',
      item_type: 'product',
      total: 10,
    });
    expect(res.body.lines[1]).toMatchObject({
      product_id: null,
      name: 'Desarrollo de app',
      item_type: 'service',
      total: 500,
    });
  });

  it('lista las facturas pendientes y resume "por cobrar"', async () => {
    const list = await request(app.getHttpServer())
      .get(`/stores/${storeId}/invoices?status=pending`)
      .set(ownerAuth())
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(invoiceId);

    const summary = await request(app.getHttpServer())
      .get(`/stores/${storeId}/invoices/summary`)
      .set(ownerAuth())
      .expect(200);

    expect(summary.body.pending_count).toBe(1);
    expect(summary.body.pending_total).toBe(510);
    expect(summary.body.paid_count).toBe(0);
  });

  it('edita la factura mientras está pendiente', async () => {
    const res = await request(app.getHttpServer())
      .put(`/stores/${storeId}/invoices/${invoiceId}`)
      .set(ownerAuth())
      .send({
        items: [{ name: 'Landing page', unit_price: 300 }],
        notes: 'Alcance ajustado',
      })
      .expect(200);

    expect(res.body.status).toBe('pending');
    expect(res.body.total).toBe(300);
    expect(res.body.lines).toHaveLength(1);
    expect(res.body.lines[0].name).toBe('Landing page');
  });

  it('rechaza un concepto libre sin precio', async () => {
    await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices`)
      .set(ownerAuth())
      .send({ items: [{ name: 'Sin precio' }] })
      .expect(400);
  });

  it('al pagar crea la venta y emite el recibo (no antes)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices/${invoiceId}/pay`)
      .set(ownerAuth())
      .send({
        payment_method_id: paymentMethodId,
        paid_at: new Date().toISOString(),
        receipt_customer_name: 'Ana Factura',
      })
      .expect(201);

    paidSaleId = res.body.sale.id;
    expect(res.body.invoice.status).toBe('paid');
    expect(res.body.invoice.sale_id).toBe(paidSaleId);
    expect(res.body.invoice.receipt_id).toBe(res.body.receipt.id);
    expect(res.body.invoice.paid_at).toBeTruthy();
    expect(res.body.sale.total).toBe(300);
    expect(res.body.sale.items[0]).toMatchObject({
      product_id: null,
      item_type: 'service',
      name: 'Landing page',
    });

    expect(res.body.receipt.number).toMatch(/^R-BRD-\d{4}-\d{6}$/);
    expect(res.body.receipt.total).toBe(300);
    expect(res.body.receipt.paid_amount).toBe(300);
    expect(res.body.receipt.lines[0].product_id).toBeNull();
    expect(res.body.receipt.verify_token).toBeTruthy();
  });

  it('la factura pagada ya no se edita, cancela ni paga otra vez', async () => {
    await request(app.getHttpServer())
      .put(`/stores/${storeId}/invoices/${invoiceId}`)
      .set(ownerAuth())
      .send({ items: [{ name: 'Otra cosa', unit_price: 1 }] })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices/${invoiceId}/cancel`)
      .set(ownerAuth())
      .expect(409);

    await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices/${invoiceId}/pay`)
      .set(ownerAuth())
      .send({})
      .expect(409);
  });

  it('los reportes de ventas ya incluyen el pago de la factura', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/stores/${storeId}/sales/summary`)
      .set(ownerAuth())
      .expect(200);

    expect(summary.body.sales_count).toBe(1);
    expect(summary.body.revenue).toBe(300);

    const invoiceSummary = await request(app.getHttpServer())
      .get(`/stores/${storeId}/invoices/summary`)
      .set(ownerAuth())
      .expect(200);

    expect(invoiceSummary.body.pending_count).toBe(0);
    expect(invoiceSummary.body.paid_count).toBe(1);
    expect(invoiceSummary.body.paid_total).toBe(300);
  });

  it('cancela una factura pendiente sin generar venta', async () => {
    const created = await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices`)
      .set(ownerAuth())
      .send({ items: [{ name: 'Consultoría', unit_price: 50 }] })
      .expect(201);

    const cancelled = await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices/${created.body.id}/cancel`)
      .set(ownerAuth())
      .expect(201);

    expect(cancelled.body.status).toBe('cancelled');

    await request(app.getHttpServer())
      .post(`/stores/${storeId}/invoices/${created.body.id}/pay`)
      .set(ownerAuth())
      .send({})
      .expect(409);

    const summary = await request(app.getHttpServer())
      .get(`/stores/${storeId}/invoices/summary`)
      .set(ownerAuth())
      .expect(200);

    expect(summary.body.pending_count).toBe(0);
    expect(summary.body.paid_count).toBe(1);
  });

  it('permite vender un servicio sin producto y lo imprime en el recibo', async () => {
    const res = await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({
        items: [
          {
            name: 'Mantenimiento mensual',
            unit_price: 80,
            unit_cost: 20,
            quantity: 2,
          },
        ],
        receipt: { enabled: true },
      })
      .expect(201);

    // 2 × 80 = 160, ganancia 2 × (80 - 20) = 120
    expect(res.body.total).toBe(160);
    expect(res.body.profit).toBe(120);
    expect(res.body.items[0]).toMatchObject({
      product_id: null,
      item_type: 'service',
      name: 'Mantenimiento mensual',
    });
    expect(res.body.receipt.lines[0]).toMatchObject({
      product_id: null,
      product_name: 'Mantenimiento mensual',
      quantity: 2,
      total: 160,
    });
  });
});
