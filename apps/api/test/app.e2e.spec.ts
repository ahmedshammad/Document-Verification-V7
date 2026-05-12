import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from '../src/health.controller';
import { FabricService } from '../src/common/fabric/fabric.service';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Set environment variables before loading the app
    process.env.DATABASE_URL = 'postgresql://smeuser:ChangeMe123!@localhost:5432/smecertdb';
    process.env.JWT_SECRET = 'TestJwtSecret123!';
    process.env.MASTER_ENCRYPTION_KEY = 'TestMasterEncryptionKey12345678';
    process.env.NODE_ENV = 'test';

    // Create a minimal test module with just the health controller
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: FabricService,
          useValue: {
            getConnectionProfile: jest.fn().mockResolvedValue({}),
            getNetworkInfo: jest.fn().mockResolvedValue({}),
            getStatus: jest.fn().mockResolvedValue({ status: 'connected' }),
            getRecentBlocks: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'sme-cert-api',
      version: '1.0.0',
    });
  });
});
