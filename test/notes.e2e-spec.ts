import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { NotesModule } from './../src/context/notes/notes.module';
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
 * e2e de notas Markdown: CRUD completo, búsqueda, pin, soft-delete/restore y
 * aislamiento entre usuarios.
 */
describe('Notes (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;

  const secret = 'test-secret-notes';
  const ownerId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  const suffix = ownerId.slice(0, 8);
  let ownerToken: string;
  let otherToken: string;
  let noteId: string;
  let indexNoteId: string;
  let pendingNoteId: string;

  const ownerAuth = () => ({ Authorization: `Bearer ${ownerToken}` });
  const otherAuth = () => ({ Authorization: `Bearer ${otherToken}` });

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
        NotesModule,
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

    await prisma.user.createMany({
      data: [
        {
          id: ownerId,
          name: 'Owner notes e2e',
          username: `e2e_notes_${suffix}`,
          email: `e2e_notes_${suffix}@example.test`,
          created_at: new Date(),
        },
        {
          id: otherId,
          name: 'Other notes e2e',
          username: `e2e_notes_other_${suffix}`,
          email: `e2e_notes_other_${suffix}@example.test`,
          created_at: new Date(),
        },
      ],
    });

    ownerToken = signJwt(
      { sub: ownerId, email: `e2e_notes_${suffix}@example.test` },
      secret,
    );
    otherToken = signJwt(
      { sub: otherId, email: `e2e_notes_other_${suffix}@example.test` },
      secret,
    );
  }, 30000);

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, otherId] } },
      });
    } finally {
      await app.close();
    }
  });

  it('crea una nota Markdown', async () => {
    const res = await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({
        title: 'Receta de pan',
        content: '# Receta\n\n- [ ] Comprar **harina**\n- [x] Precalentar',
      })
      .expect(201);

    noteId = res.body.id;
    expect(res.body.title).toBe('Receta de pan');
    expect(res.body.pinned).toBe(false);
    expect(res.body.content).toContain('**harina**');
    expect(res.body.user_id).toBe(ownerId);
  });

  it('lista sin el contenido completo y con extracto', async () => {
    const res = await request(app.getHttpServer())
      .get('/notes')
      .set(ownerAuth())
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(noteId);
    expect(res.body.data[0]).not.toHaveProperty('content');
    expect(res.body.data[0].excerpt).toContain('Comprar harina');
    expect(res.body.nextCursor).toBeNull();
  });

  it('busca por título y contenido', async () => {
    const byContent = await request(app.getHttpServer())
      .get('/notes?search=harina')
      .set(ownerAuth())
      .expect(200);
    expect(byContent.body.data).toHaveLength(1);

    const byTitle = await request(app.getHttpServer())
      .get('/notes?search=receta')
      .set(ownerAuth())
      .expect(200);
    expect(byTitle.body.data).toHaveLength(1);

    const empty = await request(app.getHttpServer())
      .get('/notes?search=inexistente')
      .set(ownerAuth())
      .expect(200);
    expect(empty.body.data).toHaveLength(0);
  });

  it('edita y fija la nota', async () => {
    const res = await request(app.getHttpServer())
      .put(`/notes/${noteId}`)
      .set(ownerAuth())
      .send({ title: 'Receta actualizada', pinned: true })
      .expect(200);

    expect(res.body.title).toBe('Receta actualizada');
    expect(res.body.pinned).toBe(true);

    const list = await request(app.getHttpServer())
      .get('/notes')
      .set(ownerAuth())
      .expect(200);
    expect(list.body.data[0].pinned).toBe(true);
  });

  it('devuelve el detalle completo y aísla por usuario', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/notes/${noteId}`)
      .set(ownerAuth())
      .expect(200);
    expect(detail.body.content).toContain('**harina**');

    await request(app.getHttpServer())
      .get(`/notes/${noteId}`)
      .set(otherAuth())
      .expect(404);
  });

  it('crea enlaces wiki, enlaces pendientes y backlinks', async () => {
    const index = await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({
        title: 'Índice de recetas',
        content: 'Ver [[Receta actualizada]] y [[Pendiente|crear después]]',
      })
      .expect(201);
    indexNoteId = index.body.id;

    const indexDetail = await request(app.getHttpServer())
      .get(`/notes/${indexNoteId}`)
      .set(ownerAuth())
      .expect(200);

    expect(indexDetail.body.links).toHaveLength(2);
    const resolved = indexDetail.body.links.find(
      (link: any) => link.raw_title === 'Receta actualizada',
    );
    expect(resolved.target_note_id).toBe(noteId);

    const pending = indexDetail.body.links.find(
      (link: any) => link.raw_title === 'Pendiente',
    );
    expect(pending.target_note_id).toBeNull();
    expect(pending.alias).toBe('crear después');

    const targetDetail = await request(app.getHttpServer())
      .get(`/notes/${noteId}`)
      .set(ownerAuth())
      .expect(200);

    expect(
      targetDetail.body.backlinks.some(
        (backlink: any) => backlink.id === indexNoteId,
      ),
    ).toBe(true);
    expect(targetDetail.body.backlinks[0]).not.toHaveProperty('content');
  });

  it('resuelve un enlace pendiente al crear la nota destino', async () => {
    const created = await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({ title: 'Pendiente', content: 'Ya existe' })
      .expect(201);
    pendingNoteId = created.body.id;

    const indexDetail = await request(app.getHttpServer())
      .get(`/notes/${indexNoteId}`)
      .set(ownerAuth())
      .expect(200);

    const link = indexDetail.body.links.find(
      (value: any) => value.raw_title === 'Pendiente',
    );
    expect(link.target_note_id).toBe(pendingNoteId);
  });

  it('busca destinos de enlace sin contenido y respeta exclude_id', async () => {
    const all = await request(app.getHttpServer())
      .get('/notes/link-targets?search=Receta&take=5')
      .set(ownerAuth())
      .expect(200);

    expect(all.body.data.some((note: any) => note.id === noteId)).toBe(true);
    expect(all.body.data[0]).not.toHaveProperty('content');

    const excluded = await request(app.getHttpServer())
      .get(`/notes/link-targets?search=Receta&exclude_id=${noteId}`)
      .set(ownerAuth())
      .expect(200);

    expect(excluded.body.data.some((note: any) => note.id === noteId)).toBe(
      false,
    );
  });

  it('reescribe los enlaces al renombrar la nota destino', async () => {
    await request(app.getHttpServer())
      .put(`/notes/${noteId}`)
      .set(ownerAuth())
      .send({ title: 'Receta definitiva' })
      .expect(200);

    const indexDetail = await request(app.getHttpServer())
      .get(`/notes/${indexNoteId}`)
      .set(ownerAuth())
      .expect(200);

    expect(indexDetail.body.content).toContain('[[Receta definitiva]]');
    expect(
      indexDetail.body.links.some(
        (value: any) => value.raw_title === 'Receta definitiva',
      ),
    ).toBe(true);
    expect(
      indexDetail.body.links.some(
        (value: any) => value.raw_title === 'Receta actualizada',
      ),
    ).toBe(false);

    const renamed = await request(app.getHttpServer())
      .get(`/notes/${noteId}`)
      .set(ownerAuth())
      .expect(200);
    expect(
      renamed.body.backlinks.some(
        (backlink: any) => backlink.id === indexNoteId,
      ),
    ).toBe(true);
  });

  it('permite el mismo título a otro usuario, pero no al mismo', async () => {
    await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({ title: 'Receta definitiva' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({ title: 'RECETA DEFINITIVA' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/notes')
      .set(otherAuth())
      .send({ title: 'Receta definitiva' })
      .expect(201);
  });

  it('rechaza campos desconocidos y títulos demasiado largos', async () => {
    await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({ title: 'x', hola: true })
      .expect(400);

    await request(app.getHttpServer())
      .post('/notes')
      .set(ownerAuth())
      .send({ title: 'x'.repeat(256) })
      .expect(400);
  });

  it('hace soft-delete, restore y hard-delete', async () => {
    await request(app.getHttpServer())
      .delete(`/notes/${noteId}`)
      .set(ownerAuth())
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/notes')
      .set(ownerAuth())
      .expect(200);
    expect(afterDelete.body.data.some((note: any) => note.id === noteId)).toBe(
      false,
    );

    await request(app.getHttpServer())
      .put(`/notes/${noteId}/restore`)
      .set(ownerAuth())
      .expect(200);

    const afterRestore = await request(app.getHttpServer())
      .get('/notes')
      .set(ownerAuth())
      .expect(200);
    expect(afterRestore.body.data.some((note: any) => note.id === noteId)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete(`/notes/${noteId}/hard`)
      .set(ownerAuth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/notes/${noteId}`)
      .set(ownerAuth())
      .expect(404);
  });
});
