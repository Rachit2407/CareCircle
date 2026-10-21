import { z } from 'zod';

export const createAlertSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(2, 'Alert title is required').max(200),
  message: z.string().min(2, 'Alert message is required').max(1000),
  suggestedAction: z.string().optional(),
  channels: z.array(z.enum(['voice_sarvam', 'sms', 'push', 'email'])).default(['push', 'sms']),
  source: z.enum(['manual', 'voice_sarvam', 'ai_triage', 'sensor_reading']).default('manual'),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
