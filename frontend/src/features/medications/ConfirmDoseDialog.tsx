import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import {
  confirmDoseInputSchema,
  type ConfirmDoseInput,
  type MedicationSchedule,
} from '@/schemas/medications';
import { medicationService } from '@/services/medicationService';

interface ConfirmDoseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: MedicationSchedule | null;
}

export function ConfirmDoseDialog({ open, onOpenChange, schedule }: ConfirmDoseDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  const form = useForm<ConfirmDoseInput>({
    resolver: zodResolver(confirmDoseInputSchema),
    defaultValues: {
      patientId,
      medicationScheduleId: schedule?.id || '',
      scheduledFor: new Date().toISOString(),
      doseStatus: 'taken',
      notes: '',
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (values: ConfirmDoseInput) => medicationService.confirmDose(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.show('dose_confirmed');
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    confirmMutation.mutate({
      ...values,
      medicationScheduleId: schedule?.id || values.medicationScheduleId,
      patientId,
    });
  });

  if (!schedule) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Confirm dose: ${schedule.medicationName}`}
      description="Record whether the dose was taken as scheduled, skipped, or missed. Note: reminder delivery is separate from dose confirmation."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-xl bg-navy-50 p-3 text-sm">
          <p className="font-bold text-navy-900">{schedule.dosage}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{schedule.instructions}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dose-status" className="block text-base font-bold text-ink">
            Dose status
          </label>
          <select
            id="dose-status"
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
            {...form.register('doseStatus')}
          >
            <option value="taken">Dose taken</option>
            <option value="skipped">Dose skipped</option>
            <option value="missed">Dose missed</option>
          </select>
        </div>

        <TextField
          label="Date and time"
          type="datetime-local"
          required
          defaultValue={new Date().toISOString().slice(0, 16)}
          onChange={(e) => {
            const iso = new Date(e.target.value).toISOString();
            form.setValue('scheduledFor', iso);
          }}
        />

        <div className="space-y-1.5">
          <label htmlFor="dose-notes" className="block text-base font-bold text-ink">
            Caregiver observation / notes{' '}
            <span className="text-sm font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="dose-notes"
            rows={2}
            placeholder="e.g. Taken with breakfast, no adverse reaction..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('notes')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={confirmMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={confirmMutation.isPending}
            loadingText="Confirming…"
          >
            Confirm dose
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
