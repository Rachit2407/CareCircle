import { z } from 'zod';
import { ALLOWED_HEALTH_RECORD_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../../services/storage.service.js';

export const requestUploadUrlSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  fileName: z.string().min(1, 'File name is required').max(255),
  contentType: z.string().refine(
    (type) => ALLOWED_HEALTH_RECORD_MIME_TYPES.includes(type.toLowerCase()),
    { message: `Invalid contentType. Allowed: ${ALLOWED_HEALTH_RECORD_MIME_TYPES.join(', ')}` }
  ),
  fileSizeBytes: z.number().positive().max(MAX_FILE_SIZE_BYTES, `Max file size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`),
  recordType: z.enum(['lab_result', 'prescription', 'discharge_summary', 'imaging', 'clinical_note', 'vaccination', 'other']),
  notes: z.string().optional(),
});

export const confirmRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  storageKey: z.string().min(1, 'Storage key is required'),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  recordType: z.enum(['lab_result', 'prescription', 'discharge_summary', 'imaging', 'clinical_note', 'vaccination', 'other']),
  notes: z.string().optional(),
});

export const listRecordsQuerySchema = z.object({
  patientId: z.string().optional(),
  recordType: z.enum(['lab_result', 'prescription', 'discharge_summary', 'imaging', 'clinical_note', 'vaccination', 'other']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type ConfirmRecordInput = z.infer<typeof confirmRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
