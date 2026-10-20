import type { z } from 'zod';
import type { sessionSchema } from '@/schemas/session';

export type Session = z.infer<typeof sessionSchema>;
