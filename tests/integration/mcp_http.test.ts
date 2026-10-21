import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { User } from '../../src/modules/users/user.model.js';
import { CareRelationship } from '../../src/modules/relationships/careRelationship.model.js';
import { Appointment } from '../../src/modules/appointments/appointment.model.js';
import { CareTask } from '../../src/modules/tasks/task.model.js';
import { HealthReading } from '../../src/modules/health-readings/reading.model.js';

describe('AI Engine MCP HTTP Endpoints — Tool Discovery & Execution', () => {
  const app = createApp();
  let patientUser: any;
  let caregiverUser: any;

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
    if (patientUser) {
      await CareRelationship.deleteMany({ patientId: patientUser._id });
      await Appointment.deleteMany({ patientId: patientUser._id });
      await CareTask.deleteMany({ patientId: patientUser._id });
      await HealthReading.deleteMany({ patientId: patientUser._id });
      await User.deleteMany({ _id: { $in: [patientUser._id, caregiverUser._id] } });
    }
  });

  it('GET /api/v1/mcp/tools returns catalog of 5 standard AI Engine tools', async () => {
    const res = await request(app).get('/api/v1/mcp/tools');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tools)).toBe(true);
    expect(res.body.tools.length).toBe(5);

    const toolNames = res.body.tools.map((t: any) => t.name);
    expect(toolNames).toContain('create_care_task');
    expect(toolNames).toContain('get_care_tasks');
    expect(toolNames).toContain('add_health_reading');
    expect(toolNames).toContain('get_next_appointment');
    expect(toolNames).toContain('send_caregiver_alert');
  });

  it('GET /mcp/tools also works without api prefix', async () => {
    const res = await request(app).get('/mcp/tools');
    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(5);
  });

  it('POST /mcp/call executes create_care_task and returns AI Engine response contract', async () => {
    const res = await request(app)
      .post('/mcp/call')
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
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
    expect(res.body.requestId).toBeDefined();
  });

  it('POST /mcp/call executes get_care_tasks and lists tasks for patient', async () => {
    // Seed task for this test
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
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
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
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
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
    // Seed upcoming appointment
    await Appointment.create({
      patientId: patientUser._id,
      provider: 'Dr. Suresh Sen (Cardiology)',
      startsAt: new Date(Date.now() + 86400000), // tomorrow
      location: 'Metro Heart Institute, Suite 402',
      status: 'scheduled',
      createdBy: caregiverUser._id,
    });

    const res = await request(app)
      .post('/mcp/call')
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
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
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
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
      .set('x-internal-service-token', env.INTERNAL_SERVICE_TOKEN)
      .send({
        tool: 'unknown_mystery_tool',
        arguments: {},
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
