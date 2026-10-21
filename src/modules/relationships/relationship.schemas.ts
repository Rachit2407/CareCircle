import { z } from 'zod';

export const createRelationshipSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  caregiverId: z.string().min(1, 'Caregiver ID is required'),
  permissions: z.array(z.enum([
    'manage_tasks',
    'manage_medications',
    'manage_appointments',
    'manage_health_readings',
    'view_records',
    'upload_records',
    'receive_alerts',
    'all',
  ])).default(['all']),
  relationshipType: z.string().default('family'),
  consentStatus: z.enum(['active', 'pending', 'revoked']).default('active'),
  notes: z.string().optional(),
});

export const updateRelationshipSchema = z.object({
  permissions: z.array(z.enum([
    'manage_tasks',
    'manage_medications',
    'manage_appointments',
    'manage_health_readings',
    'view_records',
    'upload_records',
    'receive_alerts',
    'all',
  ])).optional(),
  consentStatus: z.enum(['active', 'pending', 'revoked']).optional(),
  notes: z.string().optional(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
