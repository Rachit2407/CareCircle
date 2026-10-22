import { z } from 'zod';

const recurrenceFrequencySchema = z.enum([
  'once',
  'daily',
  'twice_daily',
  'thrice_daily',
  'weekly',
  'custom',
]);

export const medicationScheduleSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    medicationName: z.string(),
    dosage: z.string(),
    instructions: z.string(),
    recurrence: z.object({
      frequency: recurrenceFrequencySchema.default('daily'),
      times: z.array(z.string()).default(['09:00']),
      daysOfWeek: z.array(z.number()).optional(),
    }),
    timezone: z.string().default('UTC'),
    startAt: z.string(),
    endAt: z.string().nullable().optional(),
    active: z.boolean().default(true),
    prescribedBy: z.string().optional(),
    reminderPreferences: z
      .object({
        enabled: z.boolean().default(true),
        advanceMinutes: z.number().default(15),
        channels: z.array(z.string()).default(['push']),
      })
      .optional(),
    createdAt: z.string().optional(),
  })
  .transform((s) => ({
    ...s,
    id: s.id || s._id || '',
  }));

export type MedicationSchedule = z.infer<typeof medicationScheduleSchema>;

export const createMedicationScheduleInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  medicationName: z.string().min(1, 'Medication name is required').max(200),
  dosage: z.string().min(1, 'Dosage is required (e.g. 50mg, 1 tablet)'),
  instructions: z.string().min(1, 'Prescribed instructions must be preserved verbatim'),
  recurrence: z.object({
    frequency: recurrenceFrequencySchema.default('daily'),
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM format')).min(1),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }),
  timezone: z.string().default('Asia/Kolkata'),
  startAt: z.string().min(1, 'Start date is required'),
  endAt: z.string().optional(),
  active: z.boolean().default(true),
  reminderPreferences: z
    .object({
      enabled: z.boolean().default(true),
      advanceMinutes: z.number().default(15),
      channels: z.array(z.enum(['voice_sarvam', 'sms', 'push', 'email'])).default(['push']),
    })
    .optional(),
  prescribedBy: z.string().optional(),
});

export type CreateMedicationScheduleInput = z.infer<typeof createMedicationScheduleInputSchema>;

export const updateMedicationScheduleInputSchema = z.object({
  medicationName: z.string().min(1).max(200).optional(),
  dosage: z.string().optional(),
  instructions: z.string().optional(),
  recurrence: z
    .object({
      frequency: recurrenceFrequencySchema.optional(),
      times: z.array(z.string()).optional(),
      daysOfWeek: z.array(z.number()).optional(),
    })
    .optional(),
  timezone: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().nullable().optional(),
  active: z.boolean().optional(),
  reminderPreferences: z
    .object({
      enabled: z.boolean().optional(),
      advanceMinutes: z.number().optional(),
      channels: z.array(z.string()).optional(),
    })
    .optional(),
  prescribedBy: z.string().optional(),
});

export type UpdateMedicationScheduleInput = z.infer<typeof updateMedicationScheduleInputSchema>;

export const confirmDoseInputSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  medicationScheduleId: z.string().min(1, 'Schedule ID is required'),
  scheduledFor: z.string().min(1, 'Scheduled time is required'),
  doseStatus: z.enum(['taken', 'skipped', 'missed']),
  takenAt: z.string().optional(),
  notes: z.string().optional(),
});

export type ConfirmDoseInput = z.infer<typeof confirmDoseInputSchema>;

export const medicationScheduleListResponseSchema = z.union([
  z.object({ schedules: z.array(medicationScheduleSchema) }).transform((r) => r.schedules),
  z
    .object({ data: z.object({ schedules: z.array(medicationScheduleSchema) }) })
    .transform((r) => r.data.schedules),
  z.array(medicationScheduleSchema),
]);

export const medicationScheduleSingleResponseSchema = z.union([
  z.object({ schedule: medicationScheduleSchema }).transform((r) => r.schedule),
  z
    .object({ data: z.object({ schedule: medicationScheduleSchema }) })
    .transform((r) => r.data.schedule),
  medicationScheduleSchema,
]);

export const confirmDoseResponseSchema = z.union([
  z.object({ doseConfirmation: z.unknown() }).transform((r) => r.doseConfirmation),
  z.object({ data: z.unknown() }).transform((r) => r.data),
  z.unknown(),
]);
