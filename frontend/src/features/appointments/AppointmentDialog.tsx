import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import {
  createAppointmentInputSchema,
  type Appointment,
  type CreateAppointmentInput,
} from '@/schemas/appointments';
import { appointmentService } from '@/services/appointmentService';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentToEdit?: Appointment | null;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointmentToEdit,
}: AppointmentDialogProps) {
  const { circle, user } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  const defaultDate = appointmentToEdit
    ? new Date(appointmentToEdit.startsAt).toISOString().slice(0, 16)
    : new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16);

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentInputSchema),
    defaultValues: {
      patientId,
      provider: appointmentToEdit?.provider || '',
      specialty: appointmentToEdit?.specialty || '',
      startsAt: defaultDate,
      location: appointmentToEdit?.location || '',
      timezone: user.timeZone || 'Asia/Kolkata',
      notes: appointmentToEdit?.notes || '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CreateAppointmentInput) => {
      const isoStartsAt = new Date(values.startsAt).toISOString();
      if (appointmentToEdit) {
        return appointmentService.update(appointmentToEdit.id, {
          provider: values.provider,
          specialty: values.specialty,
          startsAt: isoStartsAt,
          location: values.location,
          notes: values.notes,
        });
      }
      return appointmentService.create({
        ...values,
        startsAt: isoStartsAt,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.show(appointmentToEdit ? 'appointment_updated' : 'appointment_created');
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
      title={appointmentToEdit ? 'Edit appointment' : 'Schedule appointment'}
      description="Record doctor consultations, physical therapy sessions, and clinical checkups."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Doctor / Provider name"
          required
          placeholder="e.g. Dr. V. K. Sharma"
          error={errors.provider?.message}
          {...form.register('provider')}
        />

        <TextField
          label="Specialty / Purpose"
          placeholder="e.g. Cardiologist, Routine Consultation"
          error={errors.specialty?.message}
          {...form.register('specialty')}
        />

        <TextField
          label="Appointment date & time"
          type="datetime-local"
          required
          error={errors.startsAt?.message}
          {...form.register('startsAt')}
        />

        <TextField
          label="Location or Telehealth link"
          required
          placeholder="e.g. Care Heart Clinic, Room 302 or Video Consultation link"
          error={errors.location?.message}
          {...form.register('location')}
        />

        <div className="space-y-1.5">
          <label htmlFor="apt-notes" className="block text-base font-bold text-ink">
            Visit notes / Instructions{' '}
            <span className="text-sm font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="apt-notes"
            rows={2}
            placeholder="e.g. Fasting required for blood work, bring past ECG reports..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('notes')}
          />
        </div>

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
            {appointmentToEdit ? 'Save changes' : 'Schedule visit'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
