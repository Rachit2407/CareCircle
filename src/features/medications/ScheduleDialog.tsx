import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import {
  createMedicationScheduleInputSchema,
  type CreateMedicationScheduleInput,
  type MedicationSchedule,
} from '@/schemas/medications';
import { medicationService } from '@/services/medicationService';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleToEdit?: MedicationSchedule | null;
}

export function ScheduleDialog({ open, onOpenChange, scheduleToEdit }: ScheduleDialogProps) {
  const { circle, user } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';
  const [timesString, setTimesString] = useState(
    scheduleToEdit?.recurrence.times.join(', ') || '08:30',
  );

  const form = useForm<CreateMedicationScheduleInput>({
    resolver: zodResolver(createMedicationScheduleInputSchema),
    defaultValues: {
      patientId,
      medicationName: scheduleToEdit?.medicationName || '',
      dosage: scheduleToEdit?.dosage || '',
      instructions: scheduleToEdit?.instructions || '',
      recurrence: {
        frequency: scheduleToEdit?.recurrence.frequency || 'daily',
        times: scheduleToEdit?.recurrence.times || ['08:30'],
      },
      timezone: user.timeZone || 'Asia/Kolkata',
      startAt: scheduleToEdit?.startAt || new Date().toISOString(),
      prescribedBy: scheduleToEdit?.prescribedBy || '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CreateMedicationScheduleInput) => {
      const times = timesString
        .split(',')
        .map((t) => t.trim())
        .filter((t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t));

      const payload = {
        ...values,
        recurrence: {
          ...values.recurrence,
          times: times.length > 0 ? times : ['08:30'],
        },
      };

      if (scheduleToEdit) {
        return medicationService.update(scheduleToEdit.id, payload);
      }
      return medicationService.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.show(scheduleToEdit ? 'schedule_updated' : 'schedule_created');
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={scheduleToEdit ? 'Edit medication schedule' : 'Add medication schedule'}
      description="Record doctor-prescribed medication, exact dosage, and daily reminder times."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Medication name"
          required
          placeholder="e.g. Amlodipine Besylate"
          error={errors.medicationName?.message}
          {...form.register('medicationName')}
        />

        <TextField
          label="Dosage"
          required
          placeholder="e.g. 5mg (1 tablet)"
          error={errors.dosage?.message}
          {...form.register('dosage')}
        />

        <div className="space-y-1.5">
          <label htmlFor="med-instructions" className="block text-base font-bold text-ink">
            Prescription instructions{' '}
            <span className="text-sm font-normal text-ink-muted">(preserve verbatim)</span>
          </label>
          <textarea
            id="med-instructions"
            required
            rows={2}
            placeholder="e.g. Take 1 tablet daily in the morning with water after food."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('instructions')}
          />
          {errors.instructions && (
            <p className="text-sm text-danger-fg">{errors.instructions.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="recurrence-freq" className="block text-base font-bold text-ink">
              Frequency
            </label>
            <select
              id="recurrence-freq"
              className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
              {...form.register('recurrence.frequency')}
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice daily</option>
              <option value="thrice_daily">Thrice daily</option>
              <option value="weekly">Weekly</option>
              <option value="once">Once only</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="med-times" className="block text-base font-bold text-ink">
              Scheduled times (HH:MM)
            </label>
            <input
              id="med-times"
              type="text"
              value={timesString}
              onChange={(e) => setTimesString(e.target.value)}
              placeholder="e.g. 08:30, 19:30"
              className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base text-ink focus-visible:border-navy-700"
            />
          </div>
        </div>

        <TextField
          label="Prescribed by"
          placeholder="e.g. Dr. V. K. Sharma (Cardiology)"
          error={errors.prescribedBy?.message}
          {...form.register('prescribedBy')}
        />

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saveMutation.isPending}
            loadingText="Saving…"
          >
            {scheduleToEdit ? 'Save schedule' : 'Add schedule'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
