import { z } from 'zod';

export const auditEventSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    actorId: z
      .union([
        z.string(),
        z.object({
          displayName: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional(),
        }),
      ])
      .optional(),
    patientId: z.string().optional(),
    action: z.string(),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    result: z.string(),
    metadata: z.record(z.unknown()).optional(),
    createdAt: z.string(),
  })
  .transform((a) => ({
    ...a,
    id: a.id || a._id || '',
    actorName:
      typeof a.actorId === 'object' && a.actorId !== null
        ? a.actorId.displayName || 'System'
        : 'System',
  }));

export type AuditEvent = z.infer<typeof auditEventSchema>;

export const auditEventListResponseSchema = z.union([
  z.object({ events: z.array(auditEventSchema) }).transform((r) => r.events),
  z
    .object({ data: z.object({ events: z.array(auditEventSchema) }) })
    .transform((r) => r.data.events),
  z.array(auditEventSchema),
]);

const alertSeveritySchema = z.enum(['info', 'warning', 'urgent', 'critical']);

export const createAlertInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  severity: alertSeveritySchema.default('urgent'),
  title: z.string().min(2, 'Alert title is required').max(200),
  message: z.string().min(2, 'Alert message is required').max(2000),
  suggestedAction: z.string().optional(),
  channels: z.array(z.enum(['push', 'sms', 'voice_sarvam', 'email'])).default(['push']),
  source: z.string().default('manual'),
});

export type CreateAlertInput = z.infer<typeof createAlertInputSchema>;

export const createAlertResponseSchema = z.union([
  z.object({ alert: z.unknown() }).transform((r) => r.alert),
  z.object({ data: z.unknown() }).transform((r) => r.data),
  z.unknown(),
]);
