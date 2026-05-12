import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Fund Guardian API (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let userId: string;

  const testEmail = `e2e_test_${Date.now()}@test.com`;
  const testPassword = 'E2eTest123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/health should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
    });
  });

  describe('Auth Flow', () => {
    it('POST /api/auth/register - should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      authToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('POST /api/auth/register - should reject duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword })
        .expect(500);

      expect(res.body.code).not.toBe(0);
    });

    it('POST /api/auth/login - should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.token).toBeDefined();
      authToken = res.body.data.token;
    });

    it('POST /api/auth/login - should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPass123' })
        .expect(500);

      expect(res.body.code).not.toBe(0);
    });

    it('GET /api/auth/profile - should return user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.email).toBe(testEmail);
    });

    it('GET /api/auth/profile - should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });
  });

  describe('Portfolio Flow', () => {
    it('POST /api/portfolio/funds - should add a fund', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/portfolio/funds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '半导体ETF',
          code: '512480',
          amount: 10000,
          profitRate: 0.15,
          sector: '半导体',
        })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.name).toBe('半导体ETF');
    });

    it('GET /api/portfolio/funds - should return funds list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/portfolio/funds')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/portfolio/analysis - should return sector analysis', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/portfolio/analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.sectorRatios).toBeDefined();
    });
  });

  describe('Behavior Flow', () => {
    it('POST /api/behavior/event - should record a behavior event', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/behavior/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ event: 'APP_OPEN' })
        .expect(201);

      expect(res.body.code).toBe(0);
    });

    it('GET /api/behavior/state - should return behavior state', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/behavior/state')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.score).toBeDefined();
      expect(res.body.data.level).toBeDefined();
    });

    it('GET /api/behavior/personality - should return personality', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/behavior/personality')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.type).toBeDefined();
    });

    it('GET /api/behavior/tags - should return behavior tags', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/behavior/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Risk Flow', () => {
    it('GET /api/risk/snapshot - should calculate and return risk snapshot', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/risk/snapshot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.score).toBeDefined();
      expect(res.body.data.level).toBeDefined();
    });

    it('GET /api/risk/alerts - should return risk alerts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/risk/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/risk/scenarios - should return stress test scenarios', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/risk/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(6);
    });
  });

  describe('Regret Flow', () => {
    it('GET /api/regret/scenarios - should return regret scenarios', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/regret/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.length).toBe(3);
    });

    it('POST /api/regret/simulate - should run a simulation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/regret/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenarioId: 'reduce_semi' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.simulatedAmount).toBeDefined();
      expect(res.body.data.insight).toBeDefined();
    });
  });

  describe('Growth Flow', () => {
    it('GET /api/growth/metrics - should return growth metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/growth/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.stableDays).toBeDefined();
    });
  });
});