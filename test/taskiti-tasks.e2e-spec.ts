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
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64');
  const sig = signature
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encoded}.${sig}`;
}

describe('Taskiti Tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const secret = 'test-secret-taskiti';
  const userId = crypto.randomUUID();
  const taskIds: string[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET_TASKITI_APP = secret;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule, TaskitiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    await prisma.user.create({
      data: {
        id: userId,
        name: 'e2e',
        username: `e2e_${userId.slice(0, 8)}`,
        email: `e2e_${userId.slice(0, 8)}@example.test`,
        created_at: new Date(),
      },
    });
  }, 30000);

  afterAll(async () => {
    try {
      if (taskIds.length > 0) {
        await prisma.taskiti_tasks.deleteMany({
          where: { id: { in: taskIds } },
        });
      }
      await prisma.user.delete({ where: { id: userId } });
    } finally {
      await app.close();
    }
  });

  const auth = {
    Authorization: `Bearer ${signJwt({ sub: userId, source: 'taskiti', email: 'a@b', name: 'e2e' }, secret)}`,
    'X-Client-Source': 'taskiti',
  };

  it('rejects a PATCH with a stale version with 409 version_conflict', async () => {
    const taskId = crypto.randomUUID();
    taskIds.push(taskId);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ id: taskId, title: 'Conflict task', expiry_hours: 24 })
      .expect(201);

    // First update with correct version
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set(auth)
      .send({ title: 'v1', version: 1 })
      .expect(200);

    // Second update reuses stale version 1 -> conflict
    const conflictRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set(auth)
      .send({ title: 'v2 stale', version: 1 })
      .expect(409);

    expect(conflictRes.body).toMatchObject({
      error: 'version_conflict',
      task_id: taskId,
      client_version: 1,
      server_version: 2,
    });
    expect(conflictRes.body.server_task).toBeDefined();
  }, 20000);

  it('applies completed_ids during sync and the task comes back completed', async () => {
    const taskId = crypto.randomUUID();
    taskIds.push(taskId);

    await request(app.getHttpServer())
      .post('/tasks/sync')
      .set(auth)
      .send({
        tasks: [
          {
            id: taskId,
            title: 'Complete me',
            version: 1,
            created_at: new Date().toISOString(),
          },
        ],
        deleted_ids: [],
        last_sync_at: new Date(0).toISOString(),
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/tasks/sync')
      .set(auth)
      .send({
        tasks: [],
        deleted_ids: [],
        completed_ids: [taskId],
        last_sync_at: new Date(0).toISOString(),
      })
      .expect(200);

    const pullRes = await request(app.getHttpServer())
      .get('/tasks')
      .set(auth)
      .query({ take: 100 })
      .expect(200);

    const tasks = pullRes.body.tasks || pullRes.body;
    const found = Array.isArray(tasks)
      ? tasks.find((t: any) => t.id === taskId)
      : null;
    expect(found).toBeDefined();
    expect(found.completed).toBe(true);
    expect(found.completed_at).toBeTruthy();
  }, 20000);
});
