import { api } from './api-client';
import {
  auditEventListResponseSchema,
  createAlertResponseSchema,
  type AuditEvent,
  type CreateAlertInput,
} from '@/schemas/alerts';

export const alertService = {
  create(input: CreateAlertInput): Promise<unknown> {
    return api.post('/alerts', input, createAlertResponseSchema);
  },

  listAudit(query?: { patientId?: string; limit?: number }): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return api.get(`/audit${qs ? `?${qs}` : ''}`, auditEventListResponseSchema);
  },
};
