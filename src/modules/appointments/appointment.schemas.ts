import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  provider: z.string().min(2, 'Provider name is required').max(200),
  specialty: z.string().optional(),
  startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO 8601 string' }),
  endsAt: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  location: z.string().min(2, 'Location is required (address, room, or telehealth link)'),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  provider: z.string().min(2).max(200).optional(),
  specialty: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['scheduled', 'rescheduled', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.enum(['scheduled', 'rescheduled', 'cancelled', 'completed']).optional(),
  upcomingOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
