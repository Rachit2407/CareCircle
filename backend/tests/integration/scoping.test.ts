import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CareRelationship } from '../../src/modules/relationships/careRelationship.model.js';

describe('Security & Privacy — Patient Scope Enforcement & Consent Lifecycle', () => {
  const app = createApp();

  let patient1Token: string;
  let patient1Id: string;
  let patient2Token: string;
  let patient2Id: string;
  let caregiverToken: string;
  let caregiverId: string;

  beforeEach(async () => {
    // Patient 1
    const p1 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Patient Alice',
      email: `alice_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patient1Token = p1.body.data.tokens.accessToken;
    patient1Id = p1.body.data.user.id;

    // Patient 2
    const p2 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Patient Bob',
      email: `bob_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patient2Token = p2.body.data.tokens.accessToken;
    patient2Id = p2.body.data.user.id;

    // Caregiver
    const c = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Nurse Charlie',
      email: `charlie_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'caregiver',
    });
    caregiverToken = c.body.data.tokens.accessToken;
    caregiverId = c.body.data.user.id;
  });

  it('Patient attempting to access another patient data is rejected with 403 FORBIDDEN_SCOPE', async () => {
    // Alice attempts to query Bob's tasks
    const res = await request(app)
      .get(`/api/v1/tasks?patientId=${patient2Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_SCOPE');
    expect(res.body.error.message).toContain('Patients are only authorized to access their own care records');
  });

  it('LLM/model-supplied untrusted patientId is rejected if caregiver has no active consent', async () => {
    // Simulated prompt injection where LLM passes Bob's ID to caregiver Charlie
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        patientId: patient2Id,
        title: 'Model Prompt Injected Task',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_SCOPE');
  });

  it('Revoking consent immediately cuts off caregiver access', async () => {
    // 1. Alice grants consent to Charlie
    const relRes = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        patientId: patient1Id,
        caregiverId,
        permissions: ['manage_tasks'],
        consentStatus: 'active',
      });

    const relationshipId = relRes.body.data.relationship._id;

    // 2. Charlie can initially create a task
    const taskRes1 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        patientId: patient1Id,
        title: 'Medication Prep',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });
    expect(taskRes1.status).toBe(201);

    // 3. Alice revokes consent
    const revokeRes = await request(app)
      .patch(`/api/v1/relationships/${relationshipId}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        consentStatus: 'revoked',
      });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.relationship.consentStatus).toBe('revoked');

    // 4. Charlie's subsequent attempt to access or create is immediately rejected
    const taskRes2 = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        patientId: patient1Id,
        title: 'Subsequent Task Attempt',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });
    expect(taskRes2.status).toBe(403);
    expect(taskRes2.body.error.code).toBe('FORBIDDEN_SCOPE');
  });
});
