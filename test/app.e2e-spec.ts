import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET_TASKITI_APP =
      process.env.JWT_SECRET_TASKITI_APP || 'e2e-test-secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 401 with structured error on public /auth/verify without token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/verify')
      .expect(401);
    expect(res.body).toMatchObject({ statusCode: 401 });
  });
});
