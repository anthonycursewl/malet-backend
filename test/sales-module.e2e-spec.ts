import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { SalesModule } from './../src/context/sales/sales.module';
import { AuthModule } from './../src/auth/auth.module';
import { CommonModule } from './../src/shared/common/common.module';
import { EmailModule } from './../src/shared/infrastructure/email/email.module';
import { EMAIL_SERVICE_PORT } from './../src/shared/infrastructure/email/email-service.port';
import { PrismaModule } from './../src/prisma.module';
import { PrismaService } from './../src/prisma.service';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from './../src/shared/infrastructure/file-storage/file-storage.port';

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
  let fileStorage: FileStoragePort;

  const secret = 'test-secret-sales';
  const ownerId = crypto.randomUUID();
  const intruderId = crypto.randomUUID();
  // Miembro (no dueño) de la tienda: sirve para probar las reglas de propiedad.
  const memberId = crypto.randomUUID();
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

  /** Espía del servicio de email: evita tocar el SMTP real en las pruebas. */
  const emailSpy = {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'e2e' }),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  /** Miembro activo que NO es dueño de la tienda. */
  const memberToken = signJwt(
    { sub: memberId, email: 'member@example.test' },
    secret,
  );
  const memberAuth = () => ({ Authorization: `Bearer ${memberToken}` });

  /** Mismo orden de borrado que el hard-delete del backend (limpieza defensiva). */
  const hardDeleteStoreRows = async (id: string) => {
    await prisma.$transaction([
      prisma.store_sale_items.deleteMany({ where: { sale: { store_id: id } } }),
      prisma.store_receipts.deleteMany({ where: { store_id: id } }),
      prisma.store_sales.deleteMany({ where: { store_id: id } }),
      prisma.store_customers.deleteMany({ where: { store_id: id } }),
      prisma.store_payment_methods.deleteMany({ where: { store_id: id } }),
      prisma.store_products.deleteMany({ where: { store_id: id } }),
      prisma.store_invites.deleteMany({ where: { store_id: id } }),
      prisma.store_notification_logs.deleteMany({ where: { store_id: id } }),
      prisma.store_members.deleteMany({ where: { store_id: id } }),
      prisma.stores.delete({ where: { id } }),
    ]);
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
      // Los avisos por email se capturan: la suite nunca usa el SMTP real.
      .overrideProvider(EMAIL_SERVICE_PORT)
      .useValue(emailSpy)
      .compile();

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
    fileStorage = moduleFixture.get(FILE_STORAGE_PORT);

    await prisma.user.createMany({
      data: [ownerId, intruderId, memberId].map((id, index) => ({
        id,
        name: ['Owner e2e', 'Intruder e2e', 'Member e2e'][index],
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

        // Limpieza defensiva: si la corrida falló o se interrumpió antes del
        // test de borrado, no se dejan filas ni fotos de prueba.
        const leftover = await prisma.stores.findUnique({
          where: { id: storeId },
        });
        if (leftover) {
          await Promise.all(
            [
              leftover.avatar_small_url,
              leftover.avatar_medium_url,
              leftover.avatar_large_url,
              leftover.banner_small_url,
              leftover.banner_medium_url,
              leftover.banner_large_url,
            ]
              .filter((url): url is string => !!url)
              .map((url) => fileStorage.deleteFile(url)),
          );
          await hardDeleteStoreRows(storeId);
        }
      }
      if (customerId) {
        await prisma.customers.deleteMany({ where: { id: customerId } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, intruderId, memberId] } },
      });
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
      res.body.top_products.map(
        (p: { product_name: string }) => p.product_name,
      ),
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
      .get(
        `/public/receipts/${receiptNumber}?token=${encodeURIComponent(verifyToken)}`,
      )
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

  describe('fotos de la tienda (avatar y banner)', () => {
    let avatarUrls: Record<'small' | 'medium' | 'large', string>;
    let bannerUrls: Record<'small' | 'medium' | 'large', string>;
    const uploadedUrls: string[] = [];

    /** Imagen real (JPEG) para ejercitar multer + sharp de verdad. */
    const makeImage = (width: number, height: number) =>
      sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 20, g: 120, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

    const uploadPhoto = (
      kind: 'avatar' | 'banner',
      image: Buffer,
      filename: string,
      token = ownerToken,
    ) =>
      request(app.getHttpServer())
        .put(`/stores/${storeId}/${kind}`)
        .set({ Authorization: `Bearer ${token}` })
        .attach('photo', image, { filename, contentType: 'image/jpeg' });

    /** Descarga una resolución desde la URL pública y lee sus dimensiones. */
    const publicImage = async (url: string) => {
      const res = await fetch(url);
      expect(res.status).toBe(200);
      return sharp(Buffer.from(await res.arrayBuffer())).metadata();
    };

    beforeAll(async () => {
      // Miembro que NO es dueño: entra a la tienda, pero no cambia las fotos.
      await prisma.store_members.create({
        data: {
          id: crypto.randomUUID(),
          store_id: storeId,
          user_id: memberId,
          created_by: ownerId,
        },
      });
    });

    afterAll(async () => {
      // No dejar archivos de prueba en el bucket.
      await Promise.all(uploadedUrls.map((url) => fileStorage.deleteFile(url)));
    });

    it('el dueño sube el avatar y el servidor genera 3 resoluciones distintas', async () => {
      const res = await uploadPhoto(
        'avatar',
        await makeImage(1600, 1600),
        'avatar.jpg',
      ).expect(200);

      avatarUrls = {
        small: res.body.avatar_small_url,
        medium: res.body.avatar_medium_url,
        large: res.body.avatar_large_url,
      };
      uploadedUrls.push(...Object.values(avatarUrls));

      for (const url of Object.values(avatarUrls)) {
        expect(url).toContain(`/stores/${storeId}/avatar/`);
      }
      expect(new Set(Object.values(avatarUrls)).size).toBe(3);
      // El banner todavía no existe.
      expect(res.body.banner_small_url).toBeNull();
    });

    it('las resoluciones del avatar se sirven con el ancho esperado', async () => {
      const small = await publicImage(avatarUrls.small);
      expect(small.width).toBe(96);

      const large = await publicImage(avatarUrls.large);
      expect(large.width).toBe(512);
      expect(large.format).toBe('jpeg');
    });

    it('el dueño sube el banner sin perder el avatar', async () => {
      const res = await uploadPhoto(
        'banner',
        await makeImage(3000, 1000),
        'banner.jpg',
      ).expect(200);

      bannerUrls = {
        small: res.body.banner_small_url,
        medium: res.body.banner_medium_url,
        large: res.body.banner_large_url,
      };
      uploadedUrls.push(...Object.values(bannerUrls));

      for (const url of Object.values(bannerUrls)) {
        expect(url).toContain(`/stores/${storeId}/banner/`);
      }
      // El avatar anterior sigue intacto.
      expect(res.body.avatar_medium_url).toBe(avatarUrls.medium);
    });

    it('el banner conserva la proporción original (16:3)', async () => {
      const large = await publicImage(bannerUrls.large);
      expect(large.width).toBe(1600);
      expect(large.height / large.width).toBeCloseTo(1 / 3, 2);
    });

    it('el listado y el detalle de tiendas devuelven las fotos', async () => {
      const list = await request(app.getHttpServer())
        .get('/stores')
        .set(ownerAuth())
        .expect(200);

      const fromList = list.body.data.find((s: any) => s.id === storeId);
      expect(fromList?.avatar_medium_url).toBe(avatarUrls.medium);
      expect(fromList?.banner_large_url).toBe(bannerUrls.large);

      const detail = await request(app.getHttpServer())
        .get(`/stores/${storeId}`)
        .set(ownerAuth())
        .expect(200);

      expect(detail.body.avatar_medium_url).toBe(avatarUrls.medium);
      expect(detail.body.banner_small_url).toBe(bannerUrls.small);
    });

    it('rechaza a un miembro que no es el dueño', async () => {
      await uploadPhoto(
        'avatar',
        await makeImage(600, 600),
        'avatar.jpg',
        memberToken,
      ).expect(403);
    });

    it('exige el archivo y que sea una imagen', async () => {
      await request(app.getHttpServer())
        .put(`/stores/${storeId}/avatar`)
        .set(ownerAuth())
        .expect(400);

      await request(app.getHttpServer())
        .put(`/stores/${storeId}/avatar`)
        .set(ownerAuth())
        .attach('photo', Buffer.from('no soy una imagen'), {
          filename: 'nota.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('rechaza un archivo que dice ser imagen pero no lo es', async () => {
      await uploadPhoto('avatar', Buffer.from('fake'), 'fake.jpg').expect(400);
    });

    it('al reemplazar el avatar se borran las resoluciones anteriores', async () => {
      const previous = { ...avatarUrls };
      const res = await uploadPhoto(
        'avatar',
        await makeImage(800, 800),
        'avatar-2.jpg',
      ).expect(200);

      avatarUrls = {
        small: res.body.avatar_small_url,
        medium: res.body.avatar_medium_url,
        large: res.body.avatar_large_url,
      };
      uploadedUrls.push(...Object.values(avatarUrls));

      // Las anteriores ya no están en el bucket (se evita la caché del CDN).
      const gone = await fetch(`${previous.large}?cache-bust=${Date.now()}`);
      expect(gone.status).not.toBe(200);
    });
  });

  describe('borrado de recibos (solo el dueño)', () => {
    it('un miembro que no es dueño no puede borrar ni restaurar', async () => {
      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/receipts/${receiptId}`)
        .set(memberAuth())
        .expect(403);

      await request(app.getHttpServer())
        .put(`/stores/${storeId}/receipts/${receiptId}/restore`)
        .set(memberAuth())
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/receipts/${receiptId}/hard`)
        .set(memberAuth())
        .expect(403);

      // El recibo sigue intacto.
      await request(app.getHttpServer())
        .get(`/stores/${storeId}/receipts/${receiptId}`)
        .set(ownerAuth())
        .expect(200);
    });

    it('el dueño lo borra: sale del listado y la verificación pública lo marca eliminado', async () => {
      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/receipts/${receiptId}`)
        .set(ownerAuth())
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/stores/${storeId}/receipts`)
        .set(ownerAuth())
        .expect(200);
      expect(list.body.data.some((r: any) => r.id === receiptId)).toBe(false);

      const verify = await request(app.getHttpServer())
        .get(`/public/receipts/${receiptNumber}?token=${verifyToken}`)
        .expect(200);
      expect(verify.body.status).toBe('deleted');

      // Un segundo borrado del mismo recibo no es válido.
      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/receipts/${receiptId}`)
        .set(ownerAuth())
        .expect(409);
    });

    it('el dueño puede restaurarlo', async () => {
      await request(app.getHttpServer())
        .put(`/stores/${storeId}/receipts/${receiptId}/restore`)
        .set(ownerAuth())
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/stores/${storeId}/receipts`)
        .set(ownerAuth())
        .expect(200);
      expect(list.body.data.some((r: any) => r.id === receiptId)).toBe(true);
    });

    it('el dueño puede borrarlo definitivamente', async () => {
      await request(app.getHttpServer())
        .delete(`/stores/${storeId}/receipts/${receiptId}/hard`)
        .set(ownerAuth())
        .expect(200);

      await request(app.getHttpServer())
        .get(`/stores/${storeId}/receipts/${receiptId}`)
        .set(ownerAuth())
        .expect(404);
    });
  });

  describe('avisos por email (solo el dueño)', () => {
    /** Espera a que se cumpla la condición: los avisos son fire-and-forget. */
    const waitFor = async (assertion: () => void, timeoutMs = 3000) => {
      const started = Date.now();
      for (;;) {
        try {
          assertion();
          return;
        } catch {
          if (Date.now() - started > timeoutMs) {
            assertion();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
    };

    beforeEach(() => emailSpy.sendEmail.mockClear());

    it('un miembro que no es dueño no puede ver ni cambiar los avisos', async () => {
      await request(app.getHttpServer())
        .get(`/stores/${storeId}/notifications`)
        .set(memberAuth())
        .expect(403);

      await request(app.getHttpServer())
        .put(`/stores/${storeId}/notifications`)
        .set(memberAuth())
        .send({ events: { sales: true } })
        .expect(403);
    });

    it('el dueño activa el aviso de ventas y la venta dispara el correo', async () => {
      const config = await request(app.getHttpServer())
        .get(`/stores/${storeId}/notifications`)
        .set(ownerAuth())
        .expect(200);

      expect(config.body.events).toEqual({
        sales: false,
        receipts: false,
        store: false,
        members: false,
      });
      // Solo se devuelven los miembros ya seleccionados (la lista se pagina aparte).
      expect(config.body.members).toEqual([]);

      const updated = await request(app.getHttpServer())
        .put(`/stores/${storeId}/notifications`)
        .set(ownerAuth())
        .send({ events: { sales: true }, digest: true, member_ids: [ownerId] })
        .expect(200);

      expect(updated.body.digest).toBe(true);
      expect(updated.body.events.sales).toBe(true);
      expect(
        updated.body.members.find((m: any) => m.user_id === ownerId)?.notify,
      ).toBe(true);
      expect(
        updated.body.members.find((m: any) => m.user_id === ownerId)?.avatar_url,
      ).toBeDefined();

      await request(app.getHttpServer())
        .post(`/stores/${storeId}/sales`)
        .set(ownerAuth())
        .send({ items: [{ product_id: productId }] })
        .expect(201);

      await waitFor(() => expect(emailSpy.sendEmail).toHaveBeenCalled());

      const sent = emailSpy.sendEmail.mock.calls[0][0];
      expect(sent.to).toBe(`e2e_sales_${ownerId.slice(0, 8)}@example.test`);
      expect(sent.subject).toContain('Nueva venta');

      // Se apaga de nuevo para el resto de la suite.
      await request(app.getHttpServer())
        .put(`/stores/${storeId}/notifications`)
        .set(ownerAuth())
        .send({ events: { sales: false }, digest: false, member_ids: [] })
        .expect(200);
    });
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
