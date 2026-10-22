import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/modules/users/user.model.js';
import { CareRelationship } from '../../src/modules/relationships/careRelationship.model.js';

describe('Frontend Contract Baseline — Locked SPA Expectations', () => {
  const app = createApp();

  beforeEach(async () => {
    // Clean test users before each test
    await User.deleteMany({});
    await CareRelationship.deleteMany({});
  });

  it('1. Register returns 201 with user{id, displayName, email, timeZone}, circle, tokens, and accessToken httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Ravi Verma',
        email: 'ravi.verma@contract-test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);

    // Root properties expected by frontend session parser
    expect(res.body.user).toBeDefined();
    expect(typeof res.body.user.id).toBe('string');
    expect(res.body.user.displayName).toBe('Ravi Verma');
    expect(res.body.user.email).toBe('ravi.verma@contract-test.com');
    expect(typeof res.body.user.timeZone).toBe('string');

    // Circle (object or null)
    expect(res.body).toHaveProperty('circle');

    // Tokens must still be present in body today
    expect(res.body.tokens).toBeDefined();
    expect(typeof res.body.tokens.accessToken).toBe('string');
    expect(typeof res.body.tokens.refreshToken).toBe('string');

    // Standard backend envelope data also preserved
    expect(res.body.data).toBeDefined();

    // accessToken httpOnly cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    expect(cookieStr).toContain('accessToken=');
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr.toLowerCase()).toContain('path=/');
  });

  it('2. Login returns 200 with user, circle, tokens, and cookie', async () => {
    // First register
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Ravi Verma',
        email: 'ravi.verma@contract-test.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ravi.verma@contract-test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('ravi.verma@contract-test.com');
    expect(typeof res.body.user.timeZone).toBe('string');
    expect(res.body).toHaveProperty('circle');
    expect(res.body.tokens).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    expect(cookieStr).toContain('accessToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('3. Login with wrong password returns 401 UNAUTHENTICATED', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Ravi Verma',
        email: 'ravi.verma@contract-test.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ravi.verma@contract-test.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('4. GET /auth/session returns 200 with valid cookie, and 401 without cookie', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Ravi Verma',
        email: 'ravi.verma@contract-test.com',
        password: 'Password123!',
      });

    const cookies = regRes.headers['set-cookie'];

    // With cookie -> 200
    const authedRes = await request(app)
      .get('/auth/session')
      .set('Cookie', cookies);

    expect(authedRes.status).toBe(200);
    expect(authedRes.body.user).toBeDefined();
    expect(authedRes.body.user.displayName).toBe('Ravi Verma');
    expect(typeof authedRes.body.user.timeZone).toBe('string');

    // Without cookie -> 401
    const unauthedRes = await request(app).get('/auth/session');
    expect(unauthedRes.status).toBe(401);
  });

  it('5. POST /auth/logout returns 200 and clears the accessToken cookie', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    expect(cookieStr).toMatch(/(accessToken=;|expires=|Max-Age=0)/i);
  });

  it('6. Validation failure returns HTTP 400 with top-level fieldErrors and error object', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: '',
        email: 'not-an-email',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fieldErrors).toBeDefined();
    expect(typeof res.body.fieldErrors.displayName).toBe('string');
    expect(typeof res.body.fieldErrors.email).toBe('string');
    expect(typeof res.body.fieldErrors.password).toBe('string');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('7. Duplicate email returns HTTP 409 with fieldErrors.email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'User One',
        email: 'duplicate@contract-test.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'User Two',
        email: 'duplicate@contract-test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.fieldErrors).toBeDefined();
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(res.body.fieldErrors.email).toContain('already exists');
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('CONFLICT');
  });
});
