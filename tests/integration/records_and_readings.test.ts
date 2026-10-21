import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Milestone 3 & 4 — Health Readings & Private Records Storage', () => {
  const app = createApp();

  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    const p = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Harold Finch',
      email: `harold_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'patient',
    });
    patientToken = p.body.data.tokens.accessToken;
    patientId = p.body.data.user.id;
  });

  it('Adds and lists health readings with measurement type and units', async () => {
    const readingRes = await request(app)
      .post('/api/v1/health-readings')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        type: 'blood_glucose',
        value: 112,
        unit: 'mg/dL',
        measuredAt: new Date().toISOString(),
        source: 'manual',
        notes: 'Fasting morning reading',
      });

    expect(readingRes.status).toBe(201);
    expect(readingRes.body.data.reading.value).toBe(112);

    const listRes = await request(app)
      .get(`/api/v1/health-readings?patientId=${patientId}&type=blood_glucose`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.readings.length).toBeGreaterThan(0);
  });

  it('Requests signed upload URL and enforces allowed MIME types', async () => {
    // Valid PDF upload request
    const validRes = await request(app)
      .post('/api/v1/records/upload-url')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        fileName: 'Blood_Panel_Oct2026.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 1048576,
        recordType: 'lab_result',
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data).toHaveProperty('uploadUrl');
    expect(validRes.body.data).toHaveProperty('storageKey');
    expect(validRes.body.data.expiresInSeconds).toBe(900);

    // Invalid unsupported executable MIME type
    const invalidRes = await request(app)
      .post('/api/v1/records/upload-url')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        fileName: 'malicious.exe',
        contentType: 'application/x-msdownload',
        fileSizeBytes: 1024,
        recordType: 'lab_result',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Confirms record and lists metadata without exposing raw storage keys', async () => {
    const confirmRes = await request(app)
      .post('/api/v1/records/confirm')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        storageKey: `patients/${patientId}/secret_key_123.pdf`,
        fileName: 'Discharge_Summary.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 204800,
        recordType: 'discharge_summary',
        notes: 'Cardiology discharge report',
      });

    expect(confirmRes.status).toBe(201);
    const recordId = confirmRes.body.data.record.id;

    // List records - verify storageKey is not exposed
    const listRes = await request(app)
      .get(`/api/v1/records?patientId=${patientId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    const item = listRes.body.data.records.find((r: any) => r._id === recordId);
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('storageKey');

    // Request signed download link
    const downloadRes = await request(app)
      .get(`/api/v1/records/${recordId}/download-url`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.data).toHaveProperty('downloadUrl');
    expect(downloadRes.body.data.downloadUrl).toContain('/download?key=');
  });
});
