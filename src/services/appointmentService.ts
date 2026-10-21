import { api } from './api-client';
import {
  appointmentListResponseSchema,
  appointmentSingleResponseSchema,
  type Appointment,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '@/schemas/appointments';

export const appointmentService = {
  list(query?: {
    patientId?: string;
    status?: string;
    upcomingOnly?: boolean;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.status) params.set('status', query.status);
    if (query?.upcomingOnly !== undefined) params.set('upcomingOnly', String(query.upcomingOnly));
    const qs = params.toString();
    return api.get(`/appointments${qs ? `?${qs}` : ''}`, appointmentListResponseSchema);
  },

  create(input: CreateAppointmentInput): Promise<Appointment> {
    return api.post('/appointments', input, appointmentSingleResponseSchema);
  },

  update(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
    return api.patch(`/appointments/${id}`, input, appointmentSingleResponseSchema);
  },
};
