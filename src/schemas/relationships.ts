import { z } from 'zod';

const userSummarySchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    displayName: z.string().optional().default('Member'),
    email: z.string().optional().default(''),
    phone: z.string().optional(),
    timezone: z.string().optional(),
    role: z.string().optional(),
  })
  .transform((u) => ({
    ...u,
    id: u.id || u._id || '',
  }));

export const careRelationshipSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.union([z.string(), userSummarySchema]),
    caregiverId: z.union([z.string(), userSummarySchema]),
    permissions: z.array(z.string()).default(['all']),
    relationshipType: z.string().default('family'),
    consentStatus: z.enum(['active', 'pending', 'revoked']).default('active'),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .transform((r) => ({
    ...r,
    id: r.id || r._id || '',
    patientName:
      typeof r.patientId === 'object' && r.patientId !== null
        ? r.patientId.displayName || 'Patient'
        : 'Patient',
    caregiverName:
      typeof r.caregiverId === 'object' && r.caregiverId !== null
        ? r.caregiverId.displayName || 'Caregiver'
        : 'Caregiver',
    caregiverEmail:
      typeof r.caregiverId === 'object' && r.caregiverId !== null ? r.caregiverId.email || '' : '',
    caregiverPhone:
      typeof r.caregiverId === 'object' && r.caregiverId !== null ? r.caregiverId.phone || '' : '',
  }));

export type CareRelationship = z.infer<typeof careRelationshipSchema>;

export const careRelationshipListResponseSchema = z.union([
  z.object({ relationships: z.array(careRelationshipSchema) }).transform((r) => r.relationships),
  z
    .object({ data: z.object({ relationships: z.array(careRelationshipSchema) }) })
    .transform((r) => r.data.relationships),
  z.array(careRelationshipSchema),
]);

export const createRelationshipInputSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  caregiverId: z.string().min(1, 'Caregiver ID is required'),
  permissions: z
    .array(
      z.enum([
        'manage_tasks',
        'manage_medications',
        'manage_appointments',
        'manage_health_readings',
        'view_records',
        'upload_records',
        'receive_alerts',
        'all',
      ]),
    )
    .default(['all']),
  relationshipType: z.string().default('family'),
  consentStatus: z.enum(['active', 'pending', 'revoked']).default('active'),
  notes: z.string().optional(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipInputSchema>;

export const updateRelationshipInputSchema = z.object({
  permissions: z
    .array(
      z.enum([
        'manage_tasks',
        'manage_medications',
        'manage_appointments',
        'manage_health_readings',
        'view_records',
        'upload_records',
        'receive_alerts',
        'all',
      ]),
    )
    .optional(),
  consentStatus: z.enum(['active', 'pending', 'revoked']).optional(),
  notes: z.string().optional(),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipInputSchema>;
