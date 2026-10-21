import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/users/user.model.js';
import { CareRelationship } from '../../src/modules/relationships/careRelationship.model.js';
import { Appointment } from '../../src/modules/appointments/appointment.model.js';
import { CareTask } from '../../src/modules/tasks/task.model.js';
import { HealthReading } from '../../src/modules/health-readings/reading.model.js';

describe('AI Engine MCP & Assistant — Parking, Gating & Tool Execution', () => {
  const app = createApp();
  let patientUser: any;
  let caregiverUser: any;
  const originalAiEnabled = env.AI_ENABLED;
  const originalToken = env.INTERNAL_SERVICE_TOKEN;
  const testServiceToken = 'carecircle_internal_secret_token_32chars_long';

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    patientUser = await User.create({
      displayName: 'Harish Chandra',
      email: `mcp_patient_${Date.now()}@test.com`,
      passwordHash: 'hashedpwd123',
      role: 'patient',
      timezone: 'Asia/Kolkata',
    });

    caregiverUser = await User.create({
      displayName: 'Sunita Chandra',
      email: `mcp_caregiver_${Date.now()}@test.com`,
      passwordHash: 'hashedpwd123',
      role: 'caregiver',
      timezone: 'Asia/Kolkata',
    });

    await CareRelationship.create({
      patientId: patientUser._id,
      caregiverId: caregiverUser._id,
      permissions: ['all', 'receive_alerts'],
      consentStatus: 'active',
      relationshipType: 'Daughter',
    });
  });

  afterAll(async () => {
    (env as any).AI_ENABLED = originalAiEnabled;
    (env as any).INTERNAL_SERVICE_TOKEN = originalToken;

    if (patientUser) {
      await CareRelationship.deleteMany({ patientId: patientUser._id });
      await Appointment.deleteMany({ patientId: patientUser._id });
      await CareTask.deleteMany({ patientId: patientUser._id });
      await HealthReading.deleteMany({ patientId: patientUser._id });
      await User.deleteMany({ _id: { $in: [patientUser._id, caregiverUser._id] } });
    }
  });

  describe('When AI_ENABLED is false (default parked state)', () => {
    beforeEach(() => {
      (env as any).AI_ENABLED = false;
    });

    it('GET /mcp/tools returns 503 AI_DISABLED', async () => {
      const res = await request(app).get('/mcp/tools');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('AI_DISABLED');
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('AI_DISABLED');
      expect(res.body.error.message).toContain('AI features are not enabled');
    });

    it('POST /mcp/call returns 503 AI_DISABLED', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .send({ tool: 'create_care_task', arguments: { title: 'Test' } });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('AI_DISABLED');
    });

    it('POST /api/v1/assistant/* returns 503 AI_DISABLED', async () => {
      const res = await request(app)
        .post('/api/v1/assistant/message')
        .send({ message: 'Hello' });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('AI_DISABLED');
    });
  });

  describe('When AI_ENABLED is true (enabled with strict authentication)', () => {
    beforeEach(() => {
      (env as any).AI_ENABLED = true;
      (env as any).INTERNAL_SERVICE_TOKEN = testServiceToken;
    });

    it('Rejects unauthenticated requests to /mcp/tools with 401', async () => {
      const res = await request(app).get('/mcp/tools');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('Rejects unauthenticated requests to /mcp/call with 401', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .send({ tool: 'create_care_task', arguments: { title: 'Test' } });
      expect(res.status).toBe(401);
    });

    it('Rejects unauthenticated requests to /api/v1/assistant with 401', async () => {
      const res = await request(app)
        .post('/api/v1/assistant/message')
        .send({ message: 'Hello' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /api/v1/mcp/tools returns catalog when authenticated with internal service token', async () => {
      const res = await request(app)
        .get('/api/v1/mcp/tools')
        .set('x-internal-service-token', testServiceToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tools)).toBe(true);
      expect(res.body.tools.length).toBe(5);
    });

    it('POST /mcp/call executes create_care_task and returns AI Engine response contract', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'create_care_task',
          arguments: {
            title: 'Take evening Metformin 500mg',
            dueAt: new Date(Date.now() + 7200000).toISOString(),
            priority: 'normal',
          },
          context: {
            patientId: patientUser._id.toString(),
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('created');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Take evening Metformin 500mg');
    });

    it('POST /mcp/call executes get_care_tasks and lists tasks for patient', async () => {
      await CareTask.create({
        patientId: patientUser._id,
        title: 'Morning walk 30 mins',
        dueAt: new Date(Date.now() + 3600000),
        priority: 'medium',
        status: 'pending',
        createdBy: patientUser._id,
      });

      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'get_care_tasks',
          arguments: { limit: 10 },
          context: { patientId: patientUser._id.toString() },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /mcp/call executes add_health_reading for blood pressure', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'add_health_reading',
          arguments: {
            type: 'blood_pressure',
            value: '120/80',
            unit: 'mmHg',
            notes: 'Measured sitting quietly after morning walk',
          },
          context: { patientId: patientUser._id.toString() },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('created');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.type).toBe('blood_pressure');
    });

    it('POST /mcp/call executes get_next_appointment and returns upcoming visit', async () => {
      await Appointment.create({
        patientId: patientUser._id,
        provider: 'Dr. Suresh Sen (Cardiology)',
        startsAt: new Date(Date.now() + 86400000),
        location: 'Metro Heart Institute, Suite 402',
        status: 'scheduled',
        createdBy: caregiverUser._id,
      });

      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'get_next_appointment',
          arguments: {},
          context: { patientId: patientUser._id.toString() },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.appointment).not.toBeNull();
      expect(res.body.data.appointment.provider).toContain('Dr. Suresh Sen');
    });

    it('POST /mcp/call executes send_caregiver_alert and dispatches notifications', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'send_caregiver_alert',
          arguments: {
            eventType: 'vital_abnormality',
            message: 'Systolic blood pressure spike detected at 155 mmHg',
            severity: 'high',
          },
          context: { patientId: patientUser._id.toString() },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('dispatched');
      expect(res.body.data.alertId).toBeDefined();
      expect(res.body.data.recipientCount).toBe(1);
    });

    it('POST /mcp/call returns ok: false for unknown tools', async () => {
      const res = await request(app)
        .post('/mcp/call')
        .set('x-internal-service-token', testServiceToken)
        .send({
          tool: 'unknown_mystery_tool',
          arguments: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
