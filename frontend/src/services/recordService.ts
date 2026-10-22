import { z } from 'zod';
import { api } from './api-client';
import {
  checkInListResponseSchema,
  healthReadingListResponseSchema,
  healthRecordListResponseSchema,
  uploadUrlResponseSchema,
  type CheckIn,
  type CreateCheckInInput,
  type CreateHealthReadingInput,
  type HealthReading,
  type HealthRecord,
  type UploadUrlResponse,
} from '@/schemas/records';

const downloadUrlResponseSchema = z.object({
  downloadUrl: z.string(),
  expiresInSeconds: z.number().optional(),
});

export const recordService = {
  listRecords(query?: { patientId?: string; recordType?: string }): Promise<HealthRecord[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.recordType) params.set('recordType', query.recordType);
    const qs = params.toString();
    return api.get(`/records${qs ? `?${qs}` : ''}`, healthRecordListResponseSchema);
  },

  requestUploadUrl(input: {
    patientId: string;
    fileName: string;
    contentType: string;
    fileSizeBytes: number;
    recordType: string;
    notes?: string;
  }): Promise<UploadUrlResponse> {
    return api.post('/records/upload-url', input, uploadUrlResponseSchema);
  },

  confirmRecord(input: {
    patientId: string;
    storageKey: string;
    fileName: string;
    contentType: string;
    fileSizeBytes: number;
    recordType: string;
    notes?: string;
  }): Promise<unknown> {
    return api.post('/records/confirm', input, z.unknown());
  },

  getDownloadUrl(id: string): Promise<{ downloadUrl: string; expiresInSeconds?: number }> {
    return api.get(`/records/${id}/download-url`, downloadUrlResponseSchema);
  },

  listHealthReadings(query?: {
    patientId?: string;
    type?: string;
    limit?: string | number;
  }): Promise<HealthReading[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.type) params.set('type', query.type);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return api.get(`/health-readings${qs ? `?${qs}` : ''}`, healthReadingListResponseSchema);
  },

  createHealthReading(input: CreateHealthReadingInput): Promise<unknown> {
    return api.post('/health-readings', input, z.unknown());
  },

  listCheckIns(query?: {
    patientId?: string;
    appointmentId?: string;
    limit?: string | number;
  }): Promise<CheckIn[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.appointmentId) params.set('appointmentId', query.appointmentId);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return api.get(`/check-ins${qs ? `?${qs}` : ''}`, checkInListResponseSchema);
  },

  createCheckIn(input: CreateCheckInInput): Promise<unknown> {
    return api.post('/check-ins', input, z.unknown());
  },
};
