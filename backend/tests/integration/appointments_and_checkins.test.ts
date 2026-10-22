import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Milestone 3 — Appointments & Pre-Appointment Check-ins', () => {
  const app = createApp();

  let patientToken: string;
  let patientId: string;
  let otherPatientToken: string;
  let otherPatientId: string;

  beforeEach(async () => {
    const p1 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Patient One',
      email: `p1_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patientToken = p1.body.data.tokens.accessToken;
    patientId = p1.body.data.user.id;

    const p2 = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Patient Two',
      email: `p2_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    otherPatientToken = p2.body.data.tokens.accessToken;
    otherPatientId = p2.body.data.user.id;
  });

  it('Creates appointment and schedules pre-appointment check-in', async () => {
    const apptRes = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        provider: 'Dr. Sarah Jenkins (Cardiology)',
        specialty: 'Cardiology',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        location: 'Suite 400, St. Jude Medical Center',
        notes: 'Routine 6-month pacemaker review',
      });

    expect(apptRes.status).toBe(201);
    const appointmentId = apptRes.body.data.appointment._id;

    const checkInRes = await request(app)
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        appointmentId,
        feeling: 'fair',
        painScore: 4,
        symptoms: ['mild shortness of breath', 'ankle swelling'],
        notes: 'Patient felt breathless yesterday after climbing stairs',
        aiSummary: 'Reported cardiovascular symptoms consistent with fluid retention',
        respondentType: 'patient',
      });

    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.data.checkIn.painScore).toBe(4);
    expect(checkInRes.body.data.checkIn.notes).toBe('Patient felt breathless yesterday after climbing stairs');
    expect(checkInRes.body.data.checkIn.aiSummary).toContain('[AI GENERATED - NON-CLINICAL]');
  });

  it('Rejects check-in linking to an appointment belonging to another patient', async () => {
    // Appt created for patient 2
    const otherApptRes = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .send({
        patientId: otherPatientId,
        provider: 'Dr. Smith',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        location: 'Room 101',
      });

    const otherApptId = otherApptRes.body.data.appointment._id;

    // Patient 1 tries to link patient 2's appointment to their check-in
    const res = await request(app)
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        appointmentId: otherApptId,
        feeling: 'good',
        painScore: 1,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });
});
