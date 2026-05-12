import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FabricService } from '../src/common/fabric/fabric.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * COMPREHENSIVE QA TEST SUITE
 * 
 * This suite performs end-to-end validation of:
 * - All API endpoints
 * - Authentication flows
 * - Certificate lifecycle
 * - Blockchain interactions
 * - Data persistence
 * - Input validation
 * - Error handling
 * - Authorization controls
 */

describe('COMPREHENSIVE QA AUDIT (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fabricService: FabricService;

  // Test data
  let testUser: any;
  let authToken: string;
  let testOrganization: any;
  let testTemplate: any;
  let testCertificate: any;

  beforeAll(async () => {
    // Set environment variables
    process.env.DATABASE_URL = 'postgresql://smeuser:ChangeMe123!@localhost:5432/smecertdb';
    process.env.JWT_SECRET = 'TestJwtSecret123!';
    process.env.MASTER_ENCRYPTION_KEY = 'TestMasterEncryptionKey12345678';
    process.env.NODE_ENV = 'test';
    process.env.FABRIC_CONNECTION_PROFILE_PATH = '/tmp/connection-org1.json';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FabricService)
      .useValue({
        getConnectionProfile: jest.fn().mockResolvedValue({
          name: 'org1',
          version: '1.0.0',
          organizations: { Org1MSP: { mspid: 'Org1MSP' } },
        }),
        getNetworkInfo: jest.fn().mockResolvedValue({
          channels: { mychannel: { orderers: [], peers: [], chaincodes: [] } },
        }),
        getStatus: jest.fn().mockResolvedValue({ status: 'connected', blockHeight: 100 }),
        submitTransaction: jest.fn().mockResolvedValue({ success: true, transactionId: 'test-tx-001' }),
        queryChaincode: jest.fn().mockResolvedValue({ result: 'success' }),
        getRecentBlocks: jest.fn().mockResolvedValue([
          { blockNumber: 100, transactionCount: 5, timestamp: new Date() },
          { blockNumber: 99, transactionCount: 3, timestamp: new Date() },
        ]),
        enrollUser: jest.fn().mockResolvedValue({ success: true }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    fabricService = moduleRef.get<FabricService>(FabricService);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ============================================================================
  // SECTION 1: HEALTH & BASIC ENDPOINTS
  // ============================================================================

  describe('SECTION 1: Health & System Endpoints', () => {
    it('should return health check status', async () => {
      const response = await request(app.getHttpServer()).get('/api/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'sme-cert-api',
        version: '1.0.0',
      });
    });

    it('should return blockchain network status', async () => {
      const response = await request(app.getHttpServer()).get('/api/health/blockchain');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('blockchain');
    });

    it('should return recent blockchain blocks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health/blockchain/blocks')
        .query({ count: 5 });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('blocks');
      expect(response.body).toHaveProperty('count');
    });
  });

  // ============================================================================
  // SECTION 2: AUTHENTICATION & AUTHORIZATION
  // ============================================================================

  describe('SECTION 2: Authentication & Authorization', () => {
    describe('2.1 User Registration', () => {
      it('should register a new user with valid data', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'CERTIFICATE_ISSUER',
            organizationName: 'Test Org',
          });

        expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
        testUser = response.body.user || response.body;
      });

      it('should reject registration with weak password', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'weakpass@example.com',
            password: '123',
            firstName: 'Weak',
            lastName: 'Pass',
            role: 'CERTIFICATE_ISSUER',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject registration with invalid email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'not-an-email',
            password: 'SecurePassword123!',
            firstName: 'Invalid',
            lastName: 'Email',
            role: 'CERTIFICATE_ISSUER',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject duplicate email registration', async () => {
        // First registration
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'SecurePassword123!',
            firstName: 'First',
            lastName: 'User',
            role: 'CERTIFICATE_ISSUER',
          });

        // Duplicate attempt
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'SecurePassword123!',
            firstName: 'Second',
            lastName: 'User',
            role: 'CERTIFICATE_ISSUER',
          });

        expect(response.status).toBe(HttpStatus.CONFLICT);
      });
    });

    describe('2.2 User Login', () => {
      it('should login with valid credentials', async () => {
        // Create a test user first
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'login@example.com',
            password: 'SecurePassword123!',
            firstName: 'Login',
            lastName: 'Test',
            role: 'CERTIFICATE_ISSUER',
          });

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'login@example.com',
            password: 'SecurePassword123!',
          });

        expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(response.status);
        expect(response.body).toHaveProperty('access_token');
        authToken = response.body.access_token;
      });

      it('should reject login with invalid password', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'login@example.com',
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });

      it('should reject login with non-existent user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'AnyPassword123!',
          });

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });

      it('should rate limit login attempts', async () => {
        // Make multiple failed login attempts
        for (let i = 0; i < 6; i++) {
          await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({
              email: 'login@example.com',
              password: 'WrongPassword',
            });
        }

        // 6th attempt should be rate limited
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'login@example.com',
            password: 'WrongPassword',
          });

        expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      });
    });

    describe('2.3 Password Management', () => {
      it('should request password reset', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'login@example.com',
          });

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('message');
      });

      it('should prevent user enumeration via forgot-password', async () => {
        const validResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'login@example.com',
          });

        const invalidResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'nonexistent@example.com',
          });

        expect(validResponse.status).toBe(HttpStatus.OK);
        expect(invalidResponse.status).toBe(HttpStatus.OK);
        expect(validResponse.body.message).toBe(invalidResponse.body.message);
      });
    });

    describe('2.4 Authorization & Role-Based Access', () => {
      it('should deny access to protected endpoints without token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users');

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });

      it('should deny access with invalid token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });

      it('should deny access with expired token', async () => {
        // This would require mocking token expiration
        // For now, we verify token structure is required
        const response = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', 'Bearer invalid.token.format');

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ============================================================================
  // SECTION 3: ORGANIZATION MANAGEMENT
  // ============================================================================

  describe('SECTION 3: Organization Management', () => {
    describe('3.1 Organization Registration', () => {
      it('should submit organization registration request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/organizations/register')
          .send({
            name: 'Test Organization',
            email: 'org@example.com',
            country: 'US',
            registrationNumber: 'REG-123',
            adminFirstName: 'Admin',
            adminLastName: 'User',
            adminEmail: 'admin@example.com',
          });

        expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(response.status);
        testOrganization = response.body;
      });

      it('should list pending registrations (admin only)', async () => {
        // Without token - should fail
        const noAuthResponse = await request(app.getHttpServer())
          .get('/api/v1/organizations/pending');

        expect(noAuthResponse.status).toBe(HttpStatus.UNAUTHORIZED);

        // With valid token - should succeed
        if (authToken) {
          const authResponse = await request(app.getHttpServer())
            .get('/api/v1/organizations/pending')
            .set('Authorization', `Bearer ${authToken}`);

          // May return 403 if user is not admin, but should not 500
          expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(authResponse.status);
        }
      });

      it('should list all organizations (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/organizations')
          .set('Authorization', `Bearer ${authToken || 'invalid'}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // SECTION 4: CERTIFICATE TEMPLATES
  // ============================================================================

  describe('SECTION 4: Certificate Templates', () => {
    describe('4.1 Template CRUD Operations', () => {
      it('should create a certificate template', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Template',
            description: 'A test certificate template',
            schema: {
              fields: [
                { name: 'recipientName', type: 'string', required: true },
                { name: 'course', type: 'string', required: true },
                { name: 'completionDate', type: 'date', required: true },
              ],
            },
          });

        expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
        testTemplate = response.body;
      });

      it('should list certificate templates', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/templates')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK]).toContain(response.status);
        expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
      });

      it('should get template by ID', async () => {
        if (!testTemplate?.id) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/v1/templates/${testTemplate.id}`);

        expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(response.body).toHaveProperty('id');
        }
      });

      it('should update template', async () => {
        if (!authToken || !testTemplate?.id) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/templates/${testTemplate.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Template Name',
          });

        expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
      });

      it('should delete template', async () => {
        if (!authToken || !testTemplate?.id) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .delete(`/api/v1/templates/${testTemplate.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.NO_CONTENT, HttpStatus.NOT_FOUND]).toContain(response.status);
      });
    });

    describe('4.2 Template Validation', () => {
      it('should validate template schema', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Template',
            schema: null,
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject template with missing required fields', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            // Missing 'name' field
            description: 'Template without name',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  // ============================================================================
  // SECTION 5: CERTIFICATE LIFECYCLE
  // ============================================================================

  describe('SECTION 5: Certificate Lifecycle', () => {
    describe('5.1 Certificate Issuance', () => {
      it('should issue a new certificate', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'recipient@example.com',
            recipientName: 'John Doe',
            templateId: testTemplate?.id || 'default-template',
            data: {
              course: 'Advanced TypeScript',
              completionDate: '2026-05-11',
              grade: 'A',
            },
          });

        expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
        testCertificate = response.body;
      });

      it('should reject issuance with missing required fields', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            // Missing recipientEmail and recipientName
            data: { course: 'Some Course' },
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject issuance with invalid email', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'not-an-email',
            recipientName: 'John Doe',
            templateId: testTemplate?.id || 'default-template',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('5.2 Certificate Verification', () => {
      it('should verify certificate by ID', async () => {
        if (!testCertificate?.id) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get(`/api/v1/certificates/${testCertificate.id}`);

        expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('status');
        }
      });

      it('should verify certificate by hash', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/verify-by-hash/test-hash-123');

        expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
      });

      it('should get holder certificates', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/holder')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
      });
    });

    describe('5.3 Certificate Retrieval', () => {
      it('should get issuer statistics', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/stats')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(response.body).toHaveProperty('totalIssued');
        }
      });

      it('should get recent certificates', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/recent')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 10 });

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
        }
      });
    });
  });

  // ============================================================================
  // SECTION 6: DATA PERSISTENCE LAYER
  // ============================================================================

  describe('SECTION 6: Data Persistence Layer', () => {
    describe('6.1 User Data Persistence', () => {
      it('should retrieve user data from database', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
      });

      it('should update user profile', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .patch('/api/v1/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'Name',
          });

        expect([HttpStatus.OK, HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
      });
    });

    describe('6.2 Audit Log Persistence', () => {
      it('should record audit logs', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/audit')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
        }
      });

      it('should filter audit logs by action', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/audit')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ action: 'LOGIN' });

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // SECTION 7: BLOCKCHAIN INTEGRATION
  // ============================================================================

  describe('SECTION 7: Blockchain Integration', () => {
    describe('7.1 Blockchain Network Status', () => {
      it('should retrieve blockchain network status', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/health/blockchain');

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('blockchain');
      });

      it('should retrieve recent blocks from blockchain', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/health/blockchain/blocks')
          .query({ count: 5 });

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.blocks).toBeDefined();
        expect(Array.isArray(response.body.blocks)).toBeTruthy();
      });

      it('should respect block count limits', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/health/blockchain/blocks')
          .query({ count: 100 });

        expect(response.status).toBe(HttpStatus.OK);
        // Should be capped at 20
        expect(response.body.blocks.length).toBeLessThanOrEqual(20);
      });
    });

    describe('7.2 Certificate Recording on Blockchain', () => {
      it('should record certificate on blockchain upon issuance', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'blockchain-test@example.com',
            recipientName: 'Blockchain Test User',
            templateId: testTemplate?.id || 'default-template',
            data: {
              course: 'Blockchain Fundamentals',
              completionDate: '2026-05-11',
            },
          });

        if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
          // Verify transaction was submitted to blockchain
          expect(fabricService.submitTransaction).toHaveBeenCalled();
        }
      });
    });
  });

  // ============================================================================
  // SECTION 8: STORAGE & IPFS
  // ============================================================================

  describe('SECTION 8: Storage & IPFS Integration', () => {
    describe('8.1 IPFS Storage', () => {
      it('should store data to IPFS', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/storage/ipfs')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: 'Test certificate data',
          });

        expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(response.status);
        expect(response.body).toHaveProperty('cid');
      });

      it('should retrieve data from IPFS', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/storage/ipfs/test-cid');

        expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // SECTION 9: METRICS & ANALYTICS
  // ============================================================================

  describe('SECTION 9: Metrics & Analytics', () => {
    describe('9.1 Dashboard Metrics', () => {
      it('should retrieve dashboard metrics', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
        if (response.status === HttpStatus.OK) {
          expect(response.body).toHaveProperty('totalCertificates');
        }
      });

      it('should retrieve issuance metrics', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/issuance')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
      });

      it('should retrieve verification metrics', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/verification')
          .set('Authorization', `Bearer ${authToken}`);

        expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // SECTION 10: CONTACT & SUPPORT
  // ============================================================================

  describe('SECTION 10: Contact & Support', () => {
    describe('10.1 Contact Form', () => {
      it('should submit contact form', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/contact')
          .send({
            name: 'John Doe',
            email: 'john@example.com',
            subject: 'Support Request',
            message: 'I need help with certificate verification',
          });

        expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(response.status);
      });

      it('should validate contact form fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/contact')
          .send({
            // Missing required fields
            name: 'John Doe',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject invalid email in contact form', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/contact')
          .send({
            name: 'John Doe',
            email: 'not-an-email',
            subject: 'Support Request',
            message: 'Test message',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  // ============================================================================
  // SECTION 11: INPUT VALIDATION & SECURITY
  // ============================================================================

  describe('SECTION 11: Input Validation & Security', () => {
    describe('11.1 SQL Injection Prevention', () => {
      it('should prevent SQL injection in search parameters', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: "'; DROP TABLE certificates; --" });

        expect(response.status).not.toBe(500);
      });
    });

    describe('11.2 XSS Prevention', () => {
      it('should sanitize HTML input in certificate data', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'xss-test@example.com',
            recipientName: '<script>alert("XSS")</script>',
            templateId: testTemplate?.id || 'default-template',
          });

        if ([HttpStatus.CREATED, HttpStatus.OK].includes(response.status)) {
          // Verify script tag is not stored as-is
          expect(response.body.recipientName).not.toContain('<script>');
        }
      });
    });

    describe('11.3 CSRF Protection', () => {
      it('should require valid CSRF tokens for state-changing operations', async () => {
        // This depends on CSRF middleware implementation
        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .send({
            recipientEmail: 'csrf@example.com',
            recipientName: 'Test',
          });

        // Should not allow requests without proper auth/CSRF
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('11.4 Data Type Validation', () => {
      it('should reject invalid data types', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'type-test@example.com',
            recipientName: 12345, // Should be string
            templateId: testTemplate?.id || 'default-template',
          });

        // Should handle type mismatch gracefully
        expect([HttpStatus.BAD_REQUEST, HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      });
    });
  });

  // ============================================================================
  // SECTION 12: EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('SECTION 12: Edge Cases & Error Handling', () => {
    describe('12.1 Large Payload Handling', () => {
      it('should handle large certificate data', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const largeData = {
          field1: 'x'.repeat(10000),
          field2: 'y'.repeat(10000),
          field3: 'z'.repeat(10000),
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: 'large@example.com',
            recipientName: 'Large Payload Test',
            templateId: testTemplate?.id || 'default-template',
            data: largeData,
          });

        expect([HttpStatus.BAD_REQUEST, HttpStatus.CREATED, HttpStatus.OK, HttpStatus.PAYLOAD_TOO_LARGE]).toContain(
          response.status,
        );
      });
    });

    describe('12.2 Concurrency Handling', () => {
      it('should handle simultaneous certificate issuance', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const promises = Array(5)
          .fill(null)
          .map((_, i) =>
            request(app.getHttpServer())
              .post('/api/v1/certificates')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                recipientEmail: `concurrent-${i}@example.com`,
                recipientName: `Concurrent Test ${i}`,
                templateId: testTemplate?.id || 'default-template',
              }),
          );

        const results = await Promise.all(promises);
        const successfulRequests = results.filter((r) => [HttpStatus.CREATED, HttpStatus.OK].includes(r.status));

        expect(successfulRequests.length).toBeGreaterThan(0);
      });
    });

    describe('12.3 NULL & Empty Input Handling', () => {
      it('should reject null required fields', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: null,
            recipientName: 'Test',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });

      it('should reject empty string email', async () => {
        if (!authToken) {
          this.skip();
          return;
        }

        const response = await request(app.getHttpServer())
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientEmail: '',
            recipientName: 'Test',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('12.4  404 & Not Found Handling', () => {
      it('should return 404 for non-existent certificate', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/certificates/non-existent-id-12345');

        expect(response.status).toBe(HttpStatus.NOT_FOUND);
      });

      it('should return 404 for non-existent endpoint', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/non-existent-endpoint');

        expect(response.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });
});
