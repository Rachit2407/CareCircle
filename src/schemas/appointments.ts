import { z } from 'zod';

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'rescheduled',
  'cancelled',
  'completed',
]);

export const appointmentSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    provider: z.string(),
    specialty: z.string().optional(),
    startsAt: z.string(),
    endsAt: z.string().optional(),
    timezone: z.string().default('UTC'),
    location: z.string(),
    status: appointmentStatusSchema.default('scheduled'),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((a) => ({
    ...a,
    id: a.id || a._id || '',
  }));

export type Appointment = z.infer<typeof appointmentSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const createAppointmentInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  provider: z.string().min(2, 'Provider name is required').max(200),
  specialty: z.string().optional(),
  startsAt: z.string().min(1, 'Start date and time are required'),
  endsAt: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  location: z.string().min(2, 'Location is required (address, room, or telehealth link)'),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>;

export const updateAppointmentInputSchema = z.object({
  provider: z.string().min(2).max(200).optional(),
  specialty: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  status: appointmentStatusSchema.optional(),
  notes: z.string().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentInputSchema>;

export const appointmentListResponseSchema = z.union([
  z.object({ appointments: z.array(appointmentSchema) }).transform((r) => r.appointments),
  z
    .object({ data: z.object({ appointments: z.array(appointmentSchema) }) })
    .transform((r) => r.data.appointments),
  z.array(appointmentSchema),
]);

export const appointmentSingleResponseSchema = z.union([
  z.object({ appointment: appointmentSchema }).transform((r) => r.appointment),
  z
    .object({ data: z.object({ appointment: appointmentSchema }) })
    .transform((r) => r.data.appointment),
  appointmentSchema,
]);
