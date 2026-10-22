import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AuditEvent } from '../../src/modules/audit/audit.model.js';

describe('Milestone 2 — Care Tasks Vertical Slice & Ownership Checks', () => {
  const app = createApp();

  let patientToken: string;
  let patientId: string;
  let authorizedCaregiverToken: string;
  let authorizedCaregiverId: string;
  let unauthorizedCaregiverToken: string;

  beforeEach(async () => {
    // 1. Register Patient
    const pRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Arthur Pendelton',
        email: `arthur_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'patient',
      });
    patientToken = pRes.body.data.tokens.accessToken;
    patientId = pRes.body.data.user.id;

    // 2. Register Authorized Caregiver
    const c1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Nurse Clara Barton',
        email: `clara_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'caregiver',
      });
    authorizedCaregiverToken = c1Res.body.data.tokens.accessToken;
    authorizedCaregiverId = c1Res.body.data.user.id;

    // 3. Register Unauthorized Caregiver
    const c2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Stranger Caregiver',
        email: `stranger_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'caregiver',
      });
    unauthorizedCaregiverToken = c2Res.body.data.tokens.accessToken;

    // 4. Establish Care Relationship with consent between Arthur and Clara
    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        caregiverId: authorizedCaregiverId,
        permissions: ['manage_tasks', 'manage_medications', 'receive_alerts'],
        consentStatus: 'active',
      });
  });

  it('Patient can create a care task for themselves', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        title: 'Morning Blood Pressure Check',
        description: 'Take blood pressure before breakfast',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Morning Blood Pressure Check');
    expect(res.body.data.task.status).toBe('pending');

    // Verify audit event persisted
    const audit = await AuditEvent.findOne({
      targetId: res.body.data.task._id,
      action: 'CREATE_TASK',
    });
    expect(audit).toBeDefined();
    expect(audit?.result).toBe('SUCCESS');
  });

  it('Authorized caregiver can create and list tasks for permitted patient', async () => {
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${authorizedCaregiverToken}`)
      .send({
        patientId,
        title: 'Afternoon Hydration',
        description: 'Drink 2 glasses of water',
        dueAt: new Date(Date.now() + 7200000).toISOString(),
        priority: 'medium',
      });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/tasks?patientId=${patientId}`)
      .set('Authorization', `Bearer ${authorizedCaregiverToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('Unauthorized caregiver is denied task creation with 403 FORBIDDEN_SCOPE', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${unauthorizedCaregiverToken}`)
      .send({
        patientId,
        title: 'Unauthorized Task Attempt',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_SCOPE');
  });

  it('PATCH /api/v1/tasks/:id updates status to completed and records completion metadata', async () => {
    // Create initial task
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        title: 'Evening Walk',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    const taskId = createRes.body.data.task._id;

    // Update status to completed
    const patchRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authorizedCaregiverToken}`)
      .send({
        status: 'completed',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.task.status).toBe('completed');
    expect(patchRes.body.data.task.completedAt).toBeDefined();
    expect(patchRes.body.data.task.completedBy).toBe(authorizedCaregiverId);
  });
});
