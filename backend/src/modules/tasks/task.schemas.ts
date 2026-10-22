import { z } from 'zod';

export const createTaskSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  title: z.string().min(2, 'Task title must be at least 2 characters').max(200),
  description: z.string().max(1000).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().datetime({ message: 'dueAt must be a valid ISO 8601 datetime string' }),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const listTasksQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
