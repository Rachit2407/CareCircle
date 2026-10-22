import { z } from 'zod';

/** Client validation improves UX; the server stays authoritative. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Enter your name.')
      .max(80, 'Use 80 characters or fewer.'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .email('Enter a valid email address.'),
    password: z.string().min(10, 'Use at least 10 characters.'),
    confirmPassword: z.string().min(1, 'Enter your password again.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
