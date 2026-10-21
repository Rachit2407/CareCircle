import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { McpServerAdapter } from '../../src/mcp/mcpAdapter.js';

describe('Milestone 4 — Alerts, Idempotency & MCP Tools Contract', () => {
  const app = createApp();

  let patientToken: string;
  let patientId: string;
  let caregiverToken: string;
  let caregiverId: string;

  beforeEach(async () => {
    const p = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Rose Tyler',
      email: `rose_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patientToken = p.body.data.tokens.accessToken;
    patientId = p.body.data.user.id;

    const c = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Dr. John Smith',
      email: `doctor_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'caregiver',
    });
    caregiverToken = c.body.data.tokens.accessToken;
    caregiverId = c.body.data.user.id;

    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        caregiverId,
        permissions: ['all'],
        consentStatus: 'active',
      });
  });

  it('Creates caregiver alert and enqueues notifications for permitted caregivers', async () => {
    const res = await request(app)
      .post('/api/v1/alerts')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        severity: 'high',
        title: 'Fall Detected in Living Room',
        message: 'Patient triggered voice help phrase',
        suggestedAction: 'Call patient immediately and verify status',
        channels: ['voice_sarvam', 'push', 'sms'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.alert.recipientsNotified).toBeGreaterThan(0);
    expect(res.body.data.alert.notifications.length).toBe(3);
  });

  it('Idempotent write returns cached response when replayed with same Idempotency-Key', async () => {
    const idempotencyKey = `task_key_${Date.now()}`;
    const taskPayload = {
      patientId,
      title: 'Hydration Check',
      dueAt: new Date(Date.now() + 3600000).toISOString(),
    };

    // First request
    const res1 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(taskPayload);

    expect(res1.status).toBe(201);
    const originalTaskId = res1.body.data.task._id;

    // Second request with exact same key and payload
    const res2 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(taskPayload);

    expect(res2.status).toBe(201);
    expect(res2.headers['x-idempotent-replay']).toBe('true');
    expect(res2.body.data.task._id).toBe(originalTaskId);
  });

  it('Reusing Idempotency-Key with different payload rejects with 409 IDEMPOTENCY_CONFLICT', async () => {
    const idempotencyKey = `conflict_key_${Date.now()}`;

    // First request
    await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        patientId,
        title: 'Task A',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    // Replay with DIFFERENT payload
    const conflictRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${patientToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        patientId,
        title: 'Task B Different Title',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('MCP Server Adapter creates task adhering to the same domain contract', async () => {
    const mcpResult = await McpServerAdapter.createCareTask(
      {
        patientId,
        title: 'Sarvam Voice Prompt: Take Afternoon BP',
        dueAt: new Date(Date.now() + 1800000).toISOString(),
        priority: 'high',
      },
      {
        authenticatedUserId: caregiverId,
        authenticatedUserRole: 'caregiver',
        requestId: 'mcp-test-req-123',
      }
    );

    expect(mcpResult.success).toBe(true);
    expect(mcpResult.title).toBe('Sarvam Voice Prompt: Take Afternoon BP');

    // Verify task is readable from standard dashboard REST API
    const listRes = await request(app)
      .get(`/api/v1/tasks?patientId=${patientId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    const createdInDb = listRes.body.data.find((t: any) => t._id === mcpResult.taskId);
    expect(createdInDb).toBeDefined();
  });
});
