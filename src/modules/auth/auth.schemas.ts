import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['patient', 'caregiver']).default('patient'),
  phone: z.string().optional(),
  timezone: z.string().default('UTC'),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
