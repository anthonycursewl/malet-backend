import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { GymModule } from './../src/context/gym/gym.module';
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
 * e2e del módulo Gym contra la base real: opt-in, catálogo, rutina semanal,
 * sesión (con la precarga desde el día), medidas y reportes.
 */
describe('GymModule (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;

  const secret = 'test-secret-gym';
  const userId = crypto.randomUUID();
  const suffix = userId.slice(0, 8);
  let token: string;

  let routineId: string;
  let sessionId: string;
  let exerciseId: string;
  let weekDayId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule, AuthModule, GymModule],
    }).compile();

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
        id: userId,
        name: 'Gym e2e',
        username: `e2e_gym_${suffix}`,
        email: `e2e_gym_${suffix}@example.test`,
        created_at: new Date(),
      },
    });

    token = signJwt({ sub: userId, email: `e2e_gym_${suffix}@example.test` }, secret);
  }, 30000);

  afterAll(async () => {
    try {
      // El borrado del usuario arrastra módulos, rutinas, sesiones y medidas.
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } finally {
      await app.close();
    }
  });

  it('sin el módulo activado responde 403', async () => {
    await request(app.getHttpServer())
      .get('/gym/exercises')
      .set(auth())
      .expect(403);

    await request(app.getHttpServer()).get('/gym/summary').set(auth()).expect(403);
  });

  it('lo lista como módulo opcional y lo activa', async () => {
    const modules = await request(app.getHttpServer())
      .get('/modules')
      .set(auth())
      .expect(200);

    const gym = modules.body.find((module: any) => module.key === 'gym');
    expect(gym).toBeTruthy();
    expect(gym.opt_in).toBe(true);
    expect(gym.enabled).toBe(false);

    const enabled = await request(app.getHttpServer())
      .put('/modules/gym')
      .set(auth())
      .send({ enabled: true })
      .expect(200);

    expect(enabled.body.enabled).toBe(true);
  });

  it('con el módulo activo, el catálogo base está disponible', async () => {
    const res = await request(app.getHttpServer())
      .get('/gym/exercises?take=50')
      .set(auth())
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    exerciseId = res.body.data[0].id;
  });

  it('crea una rutina, configura un día y la activa', async () => {
    const created = await request(app.getHttpServer())
      .post('/gym/routines')
      .set(auth())
      .send({ name: 'Torso / Pierna e2e' })
      .expect(201);

    routineId = created.body.id;

    await request(app.getHttpServer())
      .put(`/gym/routines/${routineId}/days/1`)
      .set(auth())
      .send({
        title: 'Torso',
        exercises: [
          {
            exercise_id: exerciseId,
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            target_weight: 50,
            rest_seconds: 90,
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/gym/routines/${routineId}/activate`)
      .set(auth())
      .expect(200);

    const week = await request(app.getHttpServer())
      .get(`/gym/routines/${routineId}/week`)
      .set(auth())
      .expect(200);

    expect(week.body.days).toHaveLength(7);

    const monday = week.body.days.find((day: any) => day.day_of_week === 1);
    expect(monday.exercises).toHaveLength(1);
    expect(monday.exercises[0].rest_seconds).toBe(90);
    weekDayId = monday.id;
  });

  it('inicia una sesión desde el día de la rutina (precargada)', async () => {
    const res = await request(app.getHttpServer())
      .post('/gym/sessions')
      .set(auth())
      .send({ routine_day_id: weekDayId })
      .expect(201);

    sessionId = res.body.id;
    expect(res.body.status).toBe('in_progress');
    expect(res.body.exercises).toHaveLength(1);
    expect(res.body.exercises[0].sets.length).toBeGreaterThan(0);
  });

  it('la completa y el volumen aparece en el resumen', async () => {
    const updated = await request(app.getHttpServer())
      .put(`/gym/sessions/${sessionId}`)
      .set(auth())
      .send({
        status: 'completed',
        duration_minutes: 45,
        rpe: 8,
        exercises: [
          {
            exercise_id: exerciseId,
            sets: [
              { reps: 10, weight: 50, completed: true },
              { reps: 8, weight: 60, completed: true },
            ],
          },
        ],
      })
      .expect(200);

    expect(updated.body.status).toBe('completed');
    expect(updated.body.date.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    expect(updated.body.id).toBe(sessionId);

    const summary = await request(app.getHttpServer())
      .get('/gym/summary?preset=last_30_days')
      .set(auth())
      .expect(200);

    expect(summary.body.sessions_count).toBe(1);
    expect(summary.body.total_volume).toBe(980);
    expect(summary.body.total_sets).toBe(2);
  });

  it('los récords reflejan el mejor peso', async () => {
    const records = await request(app.getHttpServer())
      .get('/gym/records')
      .set(auth())
      .expect(200);

    expect(records.body.data.length).toBeGreaterThan(0);

    const record = records.body.data.find(
      (item: any) => item.exercise_id === exerciseId,
    );
    expect(record.max_weight).toBe(60);
  });

  it('registra una medida y devuelve su tendencia', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/gym/body-metrics')
      .set(auth())
      .send({ date: today, weight_kg: 72.5, height_cm: 175 })
      .expect(201);

    const latest = await request(app.getHttpServer())
      .get('/gym/body-metrics/latest')
      .set(auth())
      .expect(200);

    expect(latest.body.weight_kg).toBe(72.5);
    expect(latest.body.bmi).toBeCloseTo(23.67, 1);

    const trend = await request(app.getHttpServer())
      .get('/gym/body-metrics/trend?metric=weight_kg&preset=last_30_days')
      .set(auth())
      .expect(200);

    expect(trend.body.data).toHaveLength(1);
    expect(trend.body.data[0].value).toBe(72.5);
  });

  it('el calendario muestra el día planificado y completado', async () => {
    const now = new Date();
    const res = await request(app.getHttpServer())
      .get(`/gym/calendar?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`)
      .set(auth())
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.summary.completed_days).toBeGreaterThanOrEqual(1);
  });

  it('al desactivarlo vuelve a responder 403', async () => {
    await request(app.getHttpServer())
      .put('/modules/gym')
      .set(auth())
      .send({ enabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/gym/exercises')
      .set(auth())
      .expect(403);
  });
});
