import { z } from 'zod';

export const createCheckInSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  appointmentId: z.string().optional(),
  feeling: z.enum(['great', 'good', 'fair', 'poor', 'terrible']),
  painScore: z.number().min(0, 'Pain score must be at least 0').max(10, 'Pain score cannot exceed 10'),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().optional(), // Raw answers preserved verbatim
  aiSummary: z.string().optional(), // Marked explicitly as non-clinical
  respondentType: z.enum(['patient', 'caregiver']).default('patient'),
});

export const listCheckInsQuerySchema = z.object({
  patientId: z.string().optional(),
  appointmentId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type ListCheckInsQuery = z.infer<typeof listCheckInsQuerySchema>;
