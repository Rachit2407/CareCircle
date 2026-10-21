import { z } from 'zod';

export const createMedicationScheduleSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  medicationName: z.string().min(1, 'Medication name is required').max(200),
  dosage: z.string().min(1, 'Dosage is required (e.g. 50mg, 1 tablet)'),
  instructions: z.string().min(1, 'Prescribed instructions must be preserved verbatim'),
  recurrence: z.object({
    frequency: z.enum(['once', 'daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom']).default('daily'),
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Times must be in HH:MM format')).min(1),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }),
  timezone: z.string().default('UTC'),
  startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 string' }),
  endAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
  reminderPreferences: z.object({
    enabled: z.boolean().default(true),
    advanceMinutes: z.number().min(0).max(120).default(15),
    channels: z.array(z.enum(['voice_sarvam', 'sms', 'push', 'email'])).default(['voice_sarvam', 'push']),
  }).optional(),
  prescribedBy: z.string().optional(),
});

export const updateMedicationScheduleSchema = z.object({
  medicationName: z.string().min(1).max(200).optional(),
  dosage: z.string().optional(),
  instructions: z.string().optional(),
  recurrence: z.object({
    frequency: z.enum(['once', 'daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom']).optional(),
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }).optional(),
  timezone: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
  reminderPreferences: z.object({
    enabled: z.boolean().optional(),
    advanceMinutes: z.number().min(0).max(120).optional(),
    channels: z.array(z.enum(['voice_sarvam', 'sms', 'push', 'email'])).optional(),
  }).optional(),
  prescribedBy: z.string().optional(),
});

export const confirmDoseSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  medicationScheduleId: z.string().min(1, 'Medication schedule ID is required'),
  scheduledFor: z.string().datetime(),
  doseStatus: z.enum(['taken', 'skipped', 'missed']),
  takenAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const listSchedulesQuerySchema = z.object({
  patientId: z.string().optional(),
  activeOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export type CreateMedicationScheduleInput = z.infer<typeof createMedicationScheduleSchema>;
export type UpdateMedicationScheduleInput = z.infer<typeof updateMedicationScheduleSchema>;
export type ConfirmDoseInput = z.infer<typeof confirmDoseSchema>;
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;
