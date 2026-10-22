import { z } from 'zod';

export const recordTypeSchema = z.enum([
  'lab_result',
  'prescription',
  'discharge_summary',
  'imaging',
  'clinical_note',
  'vaccination',
  'other',
]);

export type RecordType = z.infer<typeof recordTypeSchema>;

export const healthRecordSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    recordType: recordTypeSchema,
    fileName: z.string(),
    contentType: z.string(),
    fileSizeBytes: z.number(),
    uploadedBy: z
      .union([
        z.string(),
        z.object({
          displayName: z.string().optional(),
          role: z.string().optional(),
        }),
      ])
      .optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })
  .transform((r) => ({
    ...r,
    id: r.id || r._id || '',
    uploaderName:
      typeof r.uploadedBy === 'object' && r.uploadedBy !== null
        ? r.uploadedBy.displayName || 'Caregiver'
        : 'Caregiver',
  }));

export type HealthRecord = z.infer<typeof healthRecordSchema>;

export const healthRecordListResponseSchema = z.union([
  z.object({ records: z.array(healthRecordSchema) }).transform((r) => r.records),
  z
    .object({ data: z.object({ records: z.array(healthRecordSchema) }) })
    .transform((r) => r.data.records),
  z.array(healthRecordSchema),
]);

export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
  expiresAt: z.string().optional(),
  expiresInSeconds: z.number().optional(),
});

export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;

// Health Readings
const healthReadingTypeSchema = z.enum([
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'blood_glucose',
  'weight',
  'oxygen_saturation',
  'temperature',
  'respiratory_rate',
  'other',
]);

export const healthReadingSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    type: healthReadingTypeSchema,
    value: z.number(),
    unit: z.string(),
    measuredAt: z.string(),
    source: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((r) => ({
    ...r,
    id: r.id || r._id || '',
  }));

export type HealthReading = z.infer<typeof healthReadingSchema>;

export const healthReadingListResponseSchema = z.union([
  z.object({ readings: z.array(healthReadingSchema) }).transform((r) => r.readings),
  z
    .object({ data: z.object({ readings: z.array(healthReadingSchema) }) })
    .transform((r) => r.data.readings),
  z.array(healthReadingSchema),
]);

export const createHealthReadingInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  type: healthReadingTypeSchema,
  value: z.number({ required_error: 'Value is required' }),
  unit: z.string().min(1, 'Unit is required'),
  measuredAt: z.string().min(1, 'Date and time are required'),
  source: z
    .enum(['manual', 'voice_sarvam', 'device_sync', 'caregiver_entry', 'other'])
    .default('manual'),
  notes: z.string().optional(),
});

export type CreateHealthReadingInput = z.infer<typeof createHealthReadingInputSchema>;

// Check-ins
const checkInFeelingSchema = z.enum(['great', 'good', 'fair', 'poor', 'terrible']);

export const checkInSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    appointmentId: z.string().optional(),
    feeling: checkInFeelingSchema,
    painScore: z.number(),
    symptoms: z.array(z.string()).default([]),
    notes: z.string().optional(),
    aiSummary: z.string().optional(),
    respondentType: z.enum(['patient', 'caregiver']).default('patient'),
    createdAt: z.string().optional(),
  })
  .transform((c) => ({
    ...c,
    id: c.id || c._id || '',
  }));

export type CheckIn = z.infer<typeof checkInSchema>;

export const checkInListResponseSchema = z.union([
  z.object({ checkIns: z.array(checkInSchema) }).transform((r) => r.checkIns),
  z
    .object({ data: z.object({ checkIns: z.array(checkInSchema) }) })
    .transform((r) => r.data.checkIns),
  z.array(checkInSchema),
]);

export const createCheckInInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  appointmentId: z.string().optional(),
  feeling: checkInFeelingSchema,
  painScore: z.number().min(0).max(10),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().optional(),
  respondentType: z.enum(['patient', 'caregiver']).default('patient'),
});

export type CreateCheckInInput = z.infer<typeof createCheckInInputSchema>;
