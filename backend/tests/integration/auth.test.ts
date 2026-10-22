import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Milestone 1 — Authentication & Token Security', () => {
  const app = createApp();

  const patientPayload = {
    displayName: 'Eleanor Vance',
    email: 'eleanor.vance@example.com',
    password: 'Password123!',
    role: 'patient',
    timezone: 'America/New_York',
  };

  it('POST /api/v1/auth/register creates user and returns access + refresh tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.user.email).toBe('eleanor.vance@example.com');
    expect(res.body.data.user.role).toBe('patient');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('Duplicate registration is rejected with 409 CONFLICT', async () => {
    // Initial registration
    await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    // Duplicate attempt
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'eleanor.vance@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/login fails with 401 UNAUTHENTICATED on wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'eleanor.vance@example.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/v1/auth/me returns current user profile with valid Bearer token', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send(patientPayload);

    const token = regRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('eleanor.vance@example.com');
  });

  it('Protected endpoint rejects request without token with 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
