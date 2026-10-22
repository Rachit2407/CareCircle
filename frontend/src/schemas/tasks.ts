import { z } from 'zod';

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const taskRecurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const taskSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    patientId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    assigneeId: z.string().optional(),
    dueAt: z.string(),
    recurrence: taskRecurrenceSchema.default('none'),
    priority: taskPrioritySchema.default('medium'),
    status: taskStatusSchema.default('pending'),
    createdBy: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .transform((t) => ({
    ...t,
    id: t.id || t._id || '',
  }));

export type Task = z.infer<typeof taskSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskInputSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(1000).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().min(1, 'Due date is required'),
  recurrence: taskRecurrenceSchema.default('none'),
  priority: taskPrioritySchema.default('medium'),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
  recurrence: taskRecurrenceSchema.optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const taskListResponseSchema = z.union([
  z.object({ data: z.array(taskSchema) }).transform((r) => r.data),
  z.object({ tasks: z.array(taskSchema) }).transform((r) => r.tasks),
  z.array(taskSchema),
]);

export const taskSingleResponseSchema = z.union([
  z.object({ task: taskSchema }).transform((r) => r.task),
  z.object({ data: z.object({ task: taskSchema }) }).transform((r) => r.data.task),
  taskSchema,
]);
