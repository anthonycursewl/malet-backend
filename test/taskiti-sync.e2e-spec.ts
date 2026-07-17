import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TaskitiModule } from './../src/context/taskiti/taskiti.module';
import { CommonModule } from './../src/shared/common/common.module';
import { PrismaModule } from './../src/prisma.module';
import { PrismaService } from './../src/prisma.service';
import * as crypto from 'crypto';

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: object, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64');
  const sig = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encoded}.${sig}`;
}

describe('Taskiti Sync (e2e)', () => {
  let app: INestApplication;
  const secret = 'test-secret-taskiti';
  const userId = crypto.randomUUID();

  beforeAll(async () => {
    process.env.JWT_SECRET_TASKITI_APP = secret;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule, TaskitiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const prisma = moduleFixture.get(PrismaService);
    // Ensure test user exists
    await prisma.user.create({
      data: {
        id: userId,
        name: 'e2e',
        username: `e2e_${userId.slice(0, 8)}`,
        email: `e2e_${userId.slice(0, 8)}@example.test`,
        created_at: new Date(),
      },
    });

    await prisma.$disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  it('pushes a batch and pulls it back', async () => {
    const token = signJwt({ sub: userId, source: 'taskiti', email: 'a@b', name: 'e2e' }, secret);

    const task = {
      id: crypto.randomUUID(),
      title: 'E2E task',
      version: 1,
    };

    const pushRes = await request(app.getHttpServer())
      .post('/tasks/sync')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Client-Source', 'taskiti')
      .send({ batches: [{ tasks: [task], deleted_ids: [], last_sync_at: new Date(0).toISOString() }] })
      .expect(200);

    expect(pushRes.body).toBeDefined();

    // Pull (list) to check the task exists
    const pullRes = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Client-Source', 'taskiti')
      .query({ take: 10 })
      .expect(200);

    expect(pullRes.body).toBeDefined();
    const tasks = pullRes.body.tasks || pullRes.body;
    const found = Array.isArray(tasks) ? tasks.find((t) => t.id === task.id) : null;
    expect(found).toBeDefined();
  }, 20000);
});
