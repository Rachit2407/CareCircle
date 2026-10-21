import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/modules/users/user.model.js';
import { StorageService } from '../../src/services/storage.service.js';
import { validateProductionBootGuard } from '../../src/config/env.js';
import { requireRole } from '../../src/middleware/auth.js';
import { AppError } from '../../src/utils/errors.js';
import { env } from '../../src/config/env.js';

describe('Security Fixes & Rate Limits — Section A & C', () => {
  const app = createApp();

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('1. Public registration rejects role "admin"', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Malicious Attacker',
        email: 'attacker@test.com',
        password: 'Password123!',
        role: 'admin',
      });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toBeDefined();
    expect(res.body.fieldErrors.role).toBeDefined();

    // Verify user was NOT created in DB with admin role
    const userInDb = await User.findOne({ email: 'attacker@test.com' });
    expect(userInDb).toBeNull();
  });

  it('2. Idempotency provides cross-user isolation (different actors can use same key)', async () => {
    // Register user 1
    const u1 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'User One',
      email: 'u1@isolation.test',
      password: 'Password123!',
      role: 'patient',
    });
    const token1 = u1.body.tokens.accessToken;
    const patient1Id = u1.body.user.id;

    // Register user 2
    const u2 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'User Two',
      email: 'u2@isolation.test',
      password: 'Password123!',
      role: 'patient',
    });
    const token2 = u2.body.tokens.accessToken;
    const patient2Id = u2.body.user.id;

    const sharedKey = `shared_idempotency_key_${Date.now()}`;

    // User 1 performs request with shared key
    const res1 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .set('Idempotency-Key', sharedKey)
      .send({
        patientId: patient1Id,
        title: 'Task for User 1',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.task.title).toBe('Task for User 1');

    // User 2 performs request with SAME key — must succeed independently due to {actorId, key} compound index
    const res2 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token2}`)
      .set('Idempotency-Key', sharedKey)
      .send({
        patientId: patient2Id,
        title: 'Task for User 2',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.task.title).toBe('Task for User 2');
    expect(res2.headers['x-idempotent-replay']).toBeUndefined();
  });

  it('3. StorageService.verifySignature safely handles malformed and odd-length signatures without throwing', () => {
    const expires = Math.floor(Date.now() / 1000) + 900;

    // Not a string / empty
    expect(StorageService.verifySignature('GET', 'key/1', expires, '')).toBe(false);

    // Malformed non-hex string
    expect(StorageService.verifySignature('GET', 'key/1', expires, 'not-a-hex-signature-string')).toBe(false);

    // Odd-length hex (would crash Buffer.from timingSafeEqual)
    expect(StorageService.verifySignature('GET', 'key/1', expires, 'abc12')).toBe(false);

    // Valid hex but wrong length (32 hex characters instead of 64)
    expect(StorageService.verifySignature('GET', 'key/1', expires, '0123456789abcdef0123456789abcdef')).toBe(false);

    // Expired timestamp
    expect(StorageService.verifySignature('GET', 'key/1', Math.floor(Date.now() / 1000) - 100, '0'.repeat(64))).toBe(false);
  });

  it('4. Production boot guard refuses short secrets, placeholder secrets, and wildcard CORS in production', () => {
    // 1. Short secret
    expect(() =>
      validateProductionBootGuard({
        NODE_ENV: 'production',
        JWT_SECRET: 'short_key',
        JWT_REFRESH_SECRET: 'a'.repeat(32),
        STORAGE_SIGNING_SECRET: 'b'.repeat(32),
        CORS_ORIGIN: 'https://carecircle.app',
      })
    ).toThrow(/must be at least 32 characters/);

    // 2. Known placeholder secret
    expect(() =>
      validateProductionBootGuard({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        STORAGE_SIGNING_SECRET: 'carecircle-storage-signing-secret-default-key',
        CORS_ORIGIN: 'https://carecircle.app',
      })
    ).toThrow(/known insecure placeholder/);

    // 3. Wildcard CORS
    expect(() =>
      validateProductionBootGuard({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        STORAGE_SIGNING_SECRET: 'c'.repeat(32),
        CORS_ORIGIN: '*',
      })
    ).toThrow(/CORS_ORIGIN cannot be wildcard/);

    // 4. Valid production configuration passes cleanly
    expect(() =>
      validateProductionBootGuard({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        STORAGE_SIGNING_SECRET: 'c'.repeat(32),
        CORS_ORIGIN: 'https://carecircle.app,https://admin.carecircle.app',
      })
    ).not.toThrow();

    // 5. Development environment ignores placeholders
    expect(() =>
      validateProductionBootGuard({
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'short',
        STORAGE_SIGNING_SECRET: 'carecircle-storage-signing-secret-default-key',
        CORS_ORIGIN: '*',
      })
    ).not.toThrow();
  });

  it('5. requireRole middleware returns 403 ForbiddenScopeError when user lacks role', () => {
    const middleware = requireRole(['admin']);
    const mockReq: any = {
      user: {
        id: 'usr_patient_1',
        role: 'patient',
      },
    };
    const mockRes: any = {};
    let caughtError: any;

    middleware(mockReq, mockRes, (err) => {
      caughtError = err;
    });

    expect(caughtError).toBeDefined();
    expect(caughtError instanceof AppError).toBe(true);
    expect(caughtError.statusCode).toBe(403);
    expect(caughtError.code).toBe('FORBIDDEN_SCOPE');
  });

  it('6. Rate limit throttle returns standard 429 envelope with Retry-After header when enabled', async () => {
    // Temporarily enable throttle in test
    (env as any).AUTH_RATE_LIMIT_ENABLED = true;
    (env as any).AUTH_RATE_LIMIT_MAX = 2;

    const email = `throttle_${Date.now()}@test.com`;

    // 1st request
    await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword!' });
    // 2nd request
    await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword!' });

    // 3rd request -> throttled
    const throttledRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword!' });

    expect(throttledRes.status).toBe(429);
    expect(throttledRes.body.code).toBe('RATE_LIMITED');
    expect(throttledRes.body.error).toBeDefined();
    expect(throttledRes.body.error.code).toBe('RATE_LIMITED');
    expect(throttledRes.headers['retry-after']).toBeDefined();

    // Reset throttle
    (env as any).AUTH_RATE_LIMIT_ENABLED = undefined;
    (env as any).AUTH_RATE_LIMIT_MAX = 200;
  });

  it('7. Database seed script strictly refuses execution in production environment', async () => {
    const { seed } = await import('../../src/scripts/seed.js');
    const originalEnv = process.env.NODE_ENV;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('PROCESS_EXIT_CALLED');
    }) as any);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      process.env.NODE_ENV = 'production';
      await expect(seed()).rejects.toThrow('PROCESS_EXIT_CALLED');
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.env.NODE_ENV = originalEnv;
      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });
});

