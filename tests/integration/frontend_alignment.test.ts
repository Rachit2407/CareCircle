import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/users/user.model.js';
import { CareRelationship } from '../../src/modules/relationships/careRelationship.model.js';

// Exact frontend sessionSchema from carecircle-frontend/src/schemas/session.ts
const frontendSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    timeZone: z.string(),
  }),
  circle: z
    .object({
      id: z.string(),
      name: z.string(),
      recipientName: z.string(),
      role: z.string(),
    })
    .nullable(),
});

describe('Frontend Alignment — Session, Auth & Cookie Contracts', () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    const testUsers = await User.find({ email: /@frontend-test\.com$/ }).select('_id');
    const userIds = testUsers.map((u) => u._id);
    await CareRelationship.deleteMany({
      $or: [{ patientId: { $in: userIds } }, { caregiverId: { $in: userIds } }],
    });
    await User.deleteMany({ email: /@frontend-test\.com$/ });
  });

  it('Register endpoint returns valid frontend sessionSchema and sets accessToken cookie', async () => {
    const email = `patient_${Date.now()}@frontend-test.com`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Ramesh Patel',
        email,
        password: 'Password123!',
        role: 'patient',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(201);

    // Validate using exact frontend Zod session schema
    const parseResult = frontendSessionSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.user.displayName).toBe('Ramesh Patel');
      expect(parseResult.data.user.timeZone).toBe('Asia/Kolkata');
      expect(parseResult.data.circle).not.toBeNull();
      expect(parseResult.data.circle?.recipientName).toBe('Ramesh Patel');
    }

    // Verify Set-Cookie header exists with accessToken
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    expect(cookieStr).toContain('accessToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('Login endpoint supports frontend sessionSchema, cookie auth, and resolves caregiver circle', async () => {
    const patientEmail = `pat_care_${Date.now()}@frontend-test.com`;
    const caregiverEmail = `cg_care_${Date.now()}@frontend-test.com`;

    // Create patient
    const patRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Kavita Rao',
        email: patientEmail,
        password: 'Password123!',
        role: 'patient',
      });

    const patientId = patRes.body.user.id;

    // Create caregiver
    const cgRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Anita Rao',
        email: caregiverEmail,
        password: 'Password123!',
        role: 'caregiver',
      });

    const caregiverId = cgRes.body.user.id;

    // Create active care relationship
    await CareRelationship.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      caregiverId: new mongoose.Types.ObjectId(caregiverId),
      permissions: ['all'],
      consentStatus: 'active',
      relationshipType: 'Primary caregiver',
    });

    // Login as caregiver
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: caregiverEmail,
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);

    // Validate with frontend sessionSchema
    const parseResult = frontendSessionSchema.safeParse(loginRes.body);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.circle?.recipientName).toBe('Kavita Rao');
      expect(parseResult.data.circle?.role).toBe('Primary caregiver');
    }

    // Verify Cookie authentication on /auth/session
    const cookies = loginRes.headers['set-cookie'];
    const sessionRes = await request(app)
      .get('/auth/session')
      .set('Cookie', cookies);

    expect(sessionRes.status).toBe(200);
    const sessionParse = frontendSessionSchema.safeParse(sessionRes.body);
    expect(sessionParse.success).toBe(true);
  });

  it('Logout clears accessToken cookie and returns success', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    // Cleared cookie has expires in the past or max-age=0
    expect(cookieStr).toMatch(/(accessToken=;|expires=|Max-Age=0)/i);
  });

  it('Formats validation errors and conflicts with fieldErrors for frontend forms', async () => {
    // 1. Validation error (short password, invalid email)
    const invalidRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: '',
        email: 'not-an-email',
        password: '123',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.fieldErrors).toBeDefined();
    expect(invalidRes.body.fieldErrors.email).toBeDefined();
    expect(invalidRes.body.fieldErrors.displayName).toBeDefined();

    // 2. Conflict duplicate email
    const existingEmail = `duplicate_${Date.now()}@frontend-test.com`;
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'User One',
        email: existingEmail,
        password: 'Password123!',
      });

    const duplicateRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'User Two',
        email: existingEmail,
        password: 'Password123!',
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.fieldErrors).toBeDefined();
    expect(duplicateRes.body.fieldErrors.email).toContain('already exists');
  });
});
