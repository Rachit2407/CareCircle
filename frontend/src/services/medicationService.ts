import { api } from './api-client';
import {
  confirmDoseResponseSchema,
  medicationScheduleListResponseSchema,
  medicationScheduleSingleResponseSchema,
  type ConfirmDoseInput,
  type CreateMedicationScheduleInput,
  type MedicationSchedule,
  type UpdateMedicationScheduleInput,
} from '@/schemas/medications';

export const medicationService = {
  list(query?: { patientId?: string; activeOnly?: boolean }): Promise<MedicationSchedule[]> {
    const params = new URLSearchParams();
    if (query?.patientId) params.set('patientId', query.patientId);
    if (query?.activeOnly !== undefined) params.set('activeOnly', String(query.activeOnly));
    const qs = params.toString();
    return api.get(
      `/medications/schedule${qs ? `?${qs}` : ''}`,
      medicationScheduleListResponseSchema,
    );
  },

  create(input: CreateMedicationScheduleInput): Promise<MedicationSchedule> {
    return api.post('/medications/schedule', input, medicationScheduleSingleResponseSchema);
  },

  update(id: string, input: UpdateMedicationScheduleInput): Promise<MedicationSchedule> {
    return api.patch(`/medications/schedule/${id}`, input, medicationScheduleSingleResponseSchema);
  },

  confirmDose(input: ConfirmDoseInput): Promise<unknown> {
    return api.post('/medications/doses/confirm', input, confirmDoseResponseSchema);
  },
};
