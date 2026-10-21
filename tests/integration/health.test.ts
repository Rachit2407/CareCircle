import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Milestone 1 — Health & Foundation Endpoints', () => {
  const app = createApp();

  it('GET /health returns 200 with service information and requestId', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.service).toBe('CareCircle AI Backend');
    expect(res.body).toHaveProperty('requestId');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  it('GET /api/v1/health returns 200 matching API prefix', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
  });

  it('Custom X-Request-ID header is preserved and echoed', async () => {
    const customId = 'client-req-999-xyz';
    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', customId);

    expect(res.status).toBe(200);
    expect(res.body.requestId).toBe(customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('Unknown route returns 404 in standardized error format', async () => {
    const res = await request(app).get('/api/v1/unknown-route-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error).toHaveProperty('requestId');
  });
});
