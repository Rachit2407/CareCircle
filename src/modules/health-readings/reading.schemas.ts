import { z } from 'zod';

export const createHealthReadingSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  type: z.enum([
    'blood_pressure_systolic',
    'blood_pressure_diastolic',
    'heart_rate',
    'blood_glucose',
    'weight',
    'oxygen_saturation',
    'temperature',
    'respiratory_rate',
    'other',
  ]),
  value: z.number({ required_error: 'Numeric measurement value is required' }),
  unit: z.string().min(1, 'Unit is required (e.g. mmHg, bpm, mg/dL, kg, %, °F)'),
  measuredAt: z.string().datetime({ message: 'measuredAt must be a valid ISO 8601 string' }),
  source: z.enum(['manual', 'voice_sarvam', 'device_sync', 'caregiver_entry', 'other']).default('manual'),
  notes: z.string().optional(),
});

export const listHealthReadingsQuerySchema = z.object({
  patientId: z.string().optional(),
  type: z.enum([
    'blood_pressure_systolic',
    'blood_pressure_diastolic',
    'heart_rate',
    'blood_glucose',
    'weight',
    'oxygen_saturation',
    'temperature',
    'respiratory_rate',
    'other',
  ]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export type CreateHealthReadingInput = z.infer<typeof createHealthReadingSchema>;
export type ListHealthReadingsQuery = z.infer<typeof listHealthReadingsQuerySchema>;
