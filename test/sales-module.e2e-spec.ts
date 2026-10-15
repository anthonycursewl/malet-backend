import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { SalesModule } from './../src/context/sales/sales.module';
import { AuthModule } from './../src/auth/auth.module';
import { CommonModule } from './../src/shared/common/common.module';
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
 * e2e del módulo Malet Sales contra la base real: flujo de dinero completo
 * (tienda → producto → venta multi-producto + recibo → reportes → verificación
 * pública) y comprobaciones de aislamiento entre usuarios.
 */
describe('SalesModule (e2e)', () => {
  // La suite toca la base real: cada test puede tardar más de los 5 s por defecto.
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;

  const secret = 'test-secret-sales';
  const ownerId = crypto.randomUUID();
  const intruderId = crypto.randomUUID();
  const suffix = ownerId.slice(0, 8);
  let ownerToken: string;
  let intruderToken: string;
  let storeId: string;
  let productId: string;
  let secondProductId: string;
  let customerId: string;
  let saleId: string;
  let receiptId: string;
  let receiptNumber: string;
  let verifyToken: string;

  const ownerAuth = () => ({ Authorization: `Bearer ${ownerToken}` });
  const intruderAuth = () => ({ Authorization: `Bearer ${intruderToken}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule, AuthModule, SalesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mismo pipe que producción (whitelist + forbidNonWhitelisted).
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

    await prisma.user.createMany({
      data: [ownerId, intruderId].map((id, index) => ({
        id,
        name: index === 0 ? 'Owner e2e' : 'Intruder e2e',
        username: `e2e_sales_${id.slice(0, 8)}`,
        email: `e2e_sales_${id.slice(0, 8)}@example.test`,
        created_at: new Date(),
      })),
    });

    ownerToken = signJwt({ sub: ownerId, email: 'owner@example.test' }, secret);
    intruderToken = signJwt(
      { sub: intruderId, email: 'intruder@example.test' },
      secret,
    );
  }, 30000);

  afterAll(async () => {
    try {
      if (storeId) {
        // Se usa el propio endpoint de borrado definitivo (ejercita el orden de
        // borrado en cascada: items → recibos → ventas → productos → ...).
        await request(app.getHttpServer())
          .delete(`/stores/${storeId}/hard`)
          .set(ownerAuth());
      }
      if (customerId) {
        await prisma.customers.deleteMany({ where: { id: customerId } });
      }
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, intruderId] } } });
    } finally {
      await app.close();
    }
  });

  it('crea la tienda con su moneda y datos de contacto', async () => {
    const res = await request(app.getHttpServer())
      .post('/stores')
      .set(ownerAuth())
      .send({
        name: `Tienda e2e ${suffix}`,
        currency: 'COP',
        phone: '+57 300 000 0000',
        email: 'tienda@example.test',
        address: 'Calle 123',
      })
      .expect(201);

    storeId = res.body.id;
    expect(res.body.currency).toBe('COP');
    expect(res.body.phone).toBe('+57 300 000 0000');
    expect(res.body.member_count).toBeUndefined();
  });

  it('rechaza propiedades desconocidas (whitelist)', async () => {
    await request(app.getHttpServer())
      .post('/stores')
      .set(ownerAuth())
      .send({ name: 'x', currency: 'Bs', hacker: true })
      .expect(400);
  });

  it('rechaza una moneda no permitida', async () => {
    await request(app.getHttpServer())
      .post('/stores')
      .set(ownerAuth())
      .send({ name: 'x', currency: 'VES' })
      .expect(400);
  });

  it('crea los productos de la tienda', async () => {
    const first = await request(app.getHttpServer())
      .post(`/stores/${storeId}/products`)
      .set(ownerAuth())
      .send({ name: 'Café', cost: 2, pvp: 5 })
      .expect(201);
    productId = first.body.id;

    const second = await request(app.getHttpServer())
      .post(`/stores/${storeId}/products`)
      .set(ownerAuth())
      .send({ name: 'Pan', cost: 1, pvp: 2.5 })
      .expect(201);
    secondProductId = second.body.id;

    expect(first.body.name).toBe('Café');
  });

  it('crea el cliente de la tienda', async () => {
    const res = await request(app.getHttpServer())
      .post(`/stores/${storeId}/customers`)
      .set(ownerAuth())
      .send({ name: 'Ana e2e', phone: `+57${suffix}` })
      .expect(201);

    customerId = res.body.id;
    expect(res.body.linked_existing).toBe(false);
  });

  it('registra una venta multi-producto con recibo y cliente', async () => {
    const res = await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({
        items: [
          { product_id: productId, quantity: 2 },
          { product_id: secondProductId, quantity: 4, unit_price: 2 },
        ],
        customer_id: customerId,
        receipt: { enabled: true },
      })
      .expect(201);

    saleId = res.body.id;
    // 2 × 5 + 4 × 2 = 18
    expect(res.body.total).toBe(18);
    // 2 × (5 - 2) + 4 × (2 - 1) = 10
    expect(res.body.profit).toBe(10);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.customer_id).toBe(customerId);

    expect(res.body.receipt).toBeTruthy();
    receiptId = res.body.receipt.id;
    receiptNumber = res.body.receipt.number;
    verifyToken = res.body.receipt.verify_token;
    expect(receiptNumber).toMatch(/^R-BRD-\d{4}-\d{6}$/);
    expect(res.body.receipt.total).toBe(18);
    expect(res.body.receipt.customer_name).toBe('Ana e2e');
    expect(res.body.receipt.lines).toHaveLength(2);
    // Datos del emisor congelados al emitir.
    expect(res.body.receipt.store_name).toContain('Tienda e2e');
    expect(res.body.receipt.store_phone).toBe('+57 300 000 0000');
    expect(res.body.receipt.store_email).toBe('tienda@example.test');
    expect(res.body.receipt.store_address).toBe('Calle 123');
  });

  it('congela los datos del emisor: cambiarlos no altera el recibo emitido', async () => {
    await request(app.getHttpServer())
      .put(`/stores/${storeId}`)
      .set(ownerAuth())
      .send({ phone: '+57 999 999 9999', address: 'Otra dirección' })
      .expect(200);

    const receipt = await request(app.getHttpServer())
      .get(`/stores/${storeId}/receipts/${receiptId}`)
      .set(ownerAuth())
      .expect(200);

    // El recibo conserva la foto del momento de emisión.
    expect(receipt.body.store_phone).toBe('+57 300 000 0000');
    expect(receipt.body.store_address).toBe('Calle 123');

    // La tienda sí refleja el cambio para los próximos recibos.
    const store = await request(app.getHttpServer())
      .get(`/stores/${storeId}`)
      .set(ownerAuth())
      .expect(200);

    expect(store.body.phone).toBe('+57 999 999 9999');
  });

  it('agrega la venta al resumen y a la serie', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/stores/${storeId}/sales/summary`)
      .set(ownerAuth())
      .expect(200);

    expect(summary.body.sales_count).toBe(1);
    expect(summary.body.units_sold).toBe(6);
    expect(summary.body.revenue).toBe(18);
    expect(summary.body.profit).toBe(10);

    const series = await request(app.getHttpServer())
      .get(`/stores/${storeId}/sales/series?period=day`)
      .set(ownerAuth())
      .expect(200);

    expect(Array.isArray(series.body.data)).toBe(true);
    expect(series.body.data.length).toBeGreaterThan(0);
  });

  it('filtra las ventas por producto', async () => {
    const res = await request(app.getHttpServer())
      .get(`/stores/${storeId}/sales?product_id=${secondProductId}`)
      .set(ownerAuth())
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(saleId);

    const empty = await request(app.getHttpServer())
      .get(`/stores/${storeId}/sales?product_id=${crypto.randomUUID()}`)
      .set(ownerAuth())
      .expect(200);

    expect(empty.body.data).toHaveLength(0);
  });

  it('calcula las estadísticas del cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/stores/${storeId}/customers/${customerId}/stats`)
      .set(ownerAuth())
      .expect(200);

    expect(res.body.purchase_count).toBe(1);
    expect(res.body.units_bought).toBe(6);
    expect(res.body.total_spent).toBe(18);
    // Ordenado por unidades: Pan (4) por encima de Café (2).
    expect(res.body.top_products[0].product_name).toBe('Pan');
    expect(
      res.body.top_products.map((p: { product_name: string }) => p.product_name),
    ).toEqual(expect.arrayContaining(['Café', 'Pan']));
  });

  it('corrige el "Facturar a" con auditoría y sin tocar los importes', async () => {
    const res = await request(app.getHttpServer())
      .put(`/stores/${storeId}/receipts/${receiptId}`)
      .set(ownerAuth())
      .send({ customer_name: 'Ana Corregida' })
      .expect(200);

    expect(res.body.customer_name).toBe('Ana Corregida');
    expect(res.body.total).toBe(18);
    expect(res.body.customer_name_updated_by).toBe(ownerId);
    expect(res.body.customer_name_updated_at).toBeTruthy();
  });

  it('verifica públicamente el folio con su token', async () => {
    const ok = await request(app.getHttpServer())
      .get(`/public/receipts/${receiptNumber}?token=${encodeURIComponent(verifyToken)}`)
      .expect(200);

    expect(ok.body.status).toBe('valid');
    expect(ok.body.total).toBe(18);
    expect(ok.body.currency).toBe('COP');
    expect(ok.body.store_name).toContain('Tienda e2e');
    // Nunca expone datos sensibles
    expect(ok.body.lines).toBeUndefined();
    expect(ok.body.customer_name).toBeUndefined();

    await request(app.getHttpServer())
      .get(`/public/receipts/${receiptNumber}?token=forged`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/public/receipts/R-BRD-2026-999999?token=forged')
      .expect(403);
  });

  describe('aislamiento entre usuarios', () => {
    it('un no-miembro no puede leer ventas ni productos de la tienda', async () => {
      await request(app.getHttpServer())
        .get(`/stores/${storeId}/sales`)
        .set(intruderAuth())
        .expect(403);

      await request(app.getHttpServer())
        .get(`/stores/${storeId}/products`)
        .set(intruderAuth())
        .expect(403);

      await request(app.getHttpServer())
        .get(`/stores/${storeId}/receipts`)
        .set(intruderAuth())
        .expect(403);

      await request(app.getHttpServer())
        .get(`/stores/${storeId}/customers`)
        .set(intruderAuth())
        .expect(403);
    });

    it('un no-miembro no puede crear ventas en la tienda', async () => {
      await request(app.getHttpServer())
        .post(`/stores/${storeId}/sales`)
        .set(intruderAuth())
        .send({ items: [{ product_id: productId }] })
        .expect(403);
    });

    it('sin token no se puede acceder', async () => {
      await request(app.getHttpServer())
        .get(`/stores/${storeId}/sales`)
        .expect(401);
    });
  });

  it('valida la venta: producto inexistente y cantidad inválida', async () => {
    await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({ items: [{ product_id: crypto.randomUUID() }] })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({ items: [{ product_id: productId, quantity: 0 }] })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({ items: [] })
      .expect(400);
  });

  it('aplica la política de recibos de la tienda', async () => {
    // `never`: aunque el cliente pida recibo, no se emite.
    await request(app.getHttpServer())
      .put(`/stores/${storeId}`)
      .set(ownerAuth())
      .send({ receipt_mode: 'never' })
      .expect(200);

    const withoutReceipt = await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({
        items: [{ product_id: productId }],
        receipt: { enabled: true },
      })
      .expect(201);

    expect(withoutReceipt.body.receipt).toBeNull();

    // `always`: se emite aunque el cliente no lo pida.
    await request(app.getHttpServer())
      .put(`/stores/${storeId}`)
      .set(ownerAuth())
      .send({ receipt_mode: 'always' })
      .expect(200);

    const withReceipt = await request(app.getHttpServer())
      .post(`/stores/${storeId}/sales`)
      .set(ownerAuth())
      .send({ items: [{ product_id: productId }] })
      .expect(201);

    expect(withReceipt.body.receipt).toBeTruthy();
    expect(withReceipt.body.receipt.number).toMatch(/^R-BRD-\d{4}-\d{6}$/);

    // Vuelve a `ask` para el resto de la suite.
    await request(app.getHttpServer())
      .put(`/stores/${storeId}`)
      .set(ownerAuth())
      .send({ receipt_mode: 'ask' })
      .expect(200);
  });

  it('solo el dueño puede cambiar la información y la política de recibos', async () => {
    // El intruso ni siquiera es miembro.
    await request(app.getHttpServer())
      .put(`/stores/${storeId}`)
      .set(intruderAuth())
      .send({ receipt_mode: 'never' })
      .expect(403);
  });

  it('borra la tienda definitivamente con cascada ordenada', async () => {
    await request(app.getHttpServer())
      .delete(`/stores/${storeId}/hard`)
      .set(ownerAuth())
      .expect(200);

    // La tienda (y sus ventas/productos/recibos) ya no existe.
    await request(app.getHttpServer())
      .get(`/stores/${storeId}`)
      .set(ownerAuth())
      .expect(404);

    storeId = '';
  });
});
