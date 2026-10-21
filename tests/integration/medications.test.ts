import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Milestone 3 — Medications & Dose Tracking', () => {
  const app = createApp();

  let patientToken: string;
  let patientId: string;
  let caregiverToken: string;
  let caregiverId: string;

  beforeEach(async () => {
    const p = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Margaret Hall',
      email: `margaret_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patientToken = p.body.data.tokens.accessToken;
    patientId = p.body.data.user.id;

    const c = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Caregiver David',
      email: `david_${Date.now()}@example.com`,
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
        permissions: ['manage_medications'],
        consentStatus: 'active',
      });
  });

  it('Creates medication schedule and preserves clinician instructions verbatim', async () => {
    const clinicianInstructions = 'Take 1 tablet with full glass of water 30 mins before breakfast. Do not crush or chew.';

    const res = await request(app)
      .post('/api/v1/medications/schedule')
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({
        patientId,
        medicationName: 'Levothyroxine',
        dosage: '50 mcg',
        instructions: clinicianInstructions,
        recurrence: {
          frequency: 'daily',
          times: ['07:30'],
        },
        timezone: 'America/Chicago',
        startAt: new Date().toISOString(),
        reminderPreferences: {
          enabled: true,
          advanceMinutes: 15,
          channels: ['voice_sarvam', 'push'],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.schedule.medicationName).toBe('Levothyroxine');
    expect(res.body.data.schedule.instructions).toBe(clinicianInstructions);
  });

  it('Confirms dose status independently from reminder delivery', async () => {
    const createRes = await request(app)
      .post('/api/v1/medications/schedule')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        medicationName: 'Metformin',
        dosage: '500 mg',
        instructions: 'Take with evening meal',
        recurrence: { frequency: 'daily', times: ['18:00'] },
        startAt: new Date().toISOString(),
      });

    const scheduleId = createRes.body.data.schedule._id;
    const scheduledFor = new Date().toISOString();

    const confirmRes = await request(app)
      .post('/api/v1/medications/doses/confirm')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        medicationScheduleId: scheduleId,
        scheduledFor,
        doseStatus: 'taken',
        notes: 'Taken with dinner',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.doseLog.doseStatus).toBe('taken');
    expect(confirmRes.body.data.doseLog.confirmedBy).toBe(patientId);
  });
});
