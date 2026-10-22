import { api } from './api-client';
import {
  taskListResponseSchema,
  taskSingleResponseSchema,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@/schemas/tasks';

export const taskService = {
  list(query?: { patientId?: string; status?: string; priority?: string }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.status) params.set('status', query.status);
    if (query?.priority) params.set('priority', query.priority);
    const qs = params.toString();
    return api.get(`/tasks${qs ? `?${qs}` : ''}`, taskListResponseSchema);
  },

  create(input: CreateTaskInput): Promise<Task> {
    return api.post('/tasks', input, taskSingleResponseSchema);
  },

  update(id: string, input: UpdateTaskInput): Promise<Task> {
    return api.patch(`/tasks/${id}`, input, taskSingleResponseSchema);
  },
};
