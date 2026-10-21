import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/modules/users/user.model.js';
import { env } from '../../src/config/env.js';

describe('Auth Tokens Body Flag & Revocation Tests — Section C', () => {
  const app = createApp();
  const originalFlag = env.RETURN_TOKENS_IN_BODY;

  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(() => {
    (env as any).RETURN_TOKENS_IN_BODY = originalFlag;
  });

  it('When RETURN_TOKENS_IN_BODY is false, omits tokens from JSON unless X-Client-Type: native', async () => {
    (env as any).RETURN_TOKENS_IN_BODY = false;

    // 1. Browser request without native header -> tokens omitted from body, cookie still set
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Web Client User',
        email: 'webclient@test.com',
        password: 'Password123!',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.user).toBeDefined();
    expect(res1.body.tokens).toBeUndefined();
    expect(res1.headers['set-cookie']).toBeDefined();

    // 2. Native client request with X-Client-Type: native -> tokens included in body
    const res2 = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Client-Type', 'native')
      .send({
        email: 'webclient@test.com',
        password: 'Password123!',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.user).toBeDefined();
    expect(res2.body.tokens).toBeDefined();
    expect(res2.body.tokens.accessToken).toBeDefined();

    // Reset flag
    (env as any).RETURN_TOKENS_IN_BODY = true;
  });

  it('Logout bumps tokenVersion and revokes issued access tokens', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Client-Type', 'native')
      .send({
        displayName: 'Token Revoke User',
        email: 'revocation@test.com',
        password: 'Password123!',
      });

    const token = regRes.body.tokens.accessToken;
    const cookies = regRes.headers['set-cookie'];

    // Verify token works on /auth/session
    const authedRes = await request(app)
      .get('/auth/session')
      .set('Authorization', `Bearer ${token}`);
    expect(authedRes.status).toBe(200);

    // Call logout with cookie / token
    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookies)
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Now request with the old token must be rejected with 401
    const revokedRes = await request(app)
      .get('/auth/session')
      .set('Authorization', `Bearer ${token}`);
    expect(revokedRes.status).toBe(401);
    expect(revokedRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('Refresh works without a request body via httpOnly refreshToken cookie', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Cookie Refresh User',
        email: 'cookierefresh@test.com',
        password: 'Password123!',
      });

    const cookies = regRes.headers['set-cookie'];

    // Call POST /auth/refresh with cookies and NO body
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.tokens).toBeDefined();
    expect(refreshRes.headers['set-cookie']).toBeDefined();
  });
});
