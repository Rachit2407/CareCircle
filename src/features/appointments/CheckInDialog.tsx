import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { createCheckInInputSchema, type CreateCheckInInput } from '@/schemas/records';
import { recordService } from '@/services/recordService';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  providerName?: string;
}

const COMMON_SYMPTOMS = [
  'Fatigue',
  'Joint stiffness',
  'Dizziness',
  'Shortness of breath',
  'Headache',
  'Nausea',
  'Sleep disturbance',
];

export function CheckInDialog({
  open,
  onOpenChange,
  appointmentId,
  providerName,
}: CheckInDialogProps) {
  const { circle, user } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const form = useForm<CreateCheckInInput>({
    resolver: zodResolver(createCheckInInputSchema),
    defaultValues: {
      patientId,
      appointmentId: appointmentId || undefined,
      feeling: 'good',
      painScore: 0,
      symptoms: [],
      notes: '',
      respondentType: user.role === 'patient' ? 'patient' : 'caregiver',
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (values: CreateCheckInInput) => recordService.createCheckIn(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      toast.show('checkin_saved');
      onOpenChange(false);
      form.reset();
    },
  });

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom];
      form.setValue('symptoms', next);
      return next;
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    checkInMutation.mutate({
      ...values,
      appointmentId,
      patientId,
      symptoms: selectedSymptoms,
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={providerName ? `Visit check-in: ${providerName}` : 'Record care check-in'}
      description="Record current well-being, pain levels, and symptoms for doctor visits or daily care logs."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="checkin-feeling" className="block text-base font-bold text-ink">
            Overall feeling
          </label>
          <select
            id="checkin-feeling"
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
            {...form.register('feeling')}
          >
            <option value="great">Great — energetic and comfortable</option>
            <option value="good">Good — standard day, feeling well</option>
            <option value="fair">Fair — some fatigue or discomfort</option>
            <option value="poor">Poor — struggling or unwell</option>
            <option value="terrible">Terrible — significant pain or distress</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label htmlFor="pain-score" className="text-base font-bold text-ink">
              Pain score (0 to 10)
            </label>
            <span className="font-bold text-navy-800">{form.watch('painScore') ?? 0} / 10</span>
          </div>
          <input
            id="pain-score"
            type="range"
            min={0}
            max={10}
            step={1}
            className="w-full accent-navy-700"
            {...form.register('painScore', { valueAsNumber: true })}
          />
          <div className="flex justify-between text-xs text-ink-muted">
            <span>0 (No pain)</span>
            <span>5 (Moderate)</span>
            <span>10 (Severe)</span>
          </div>
        </div>

        <div className="space-y-2">
          <p id="symptoms-label" className="block text-base font-bold text-ink">
            Symptoms observed
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="symptoms-label">
            {COMMON_SYMPTOMS.map((symptom) => {
              const active = selectedSymptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-navy-900 text-paper'
                      : 'border border-line bg-navy-50 text-ink hover:bg-navy-100'
                  }`}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="checkin-notes" className="block text-base font-bold text-ink">
            Caregiver observation / Patient notes
          </label>
          <textarea
            id="checkin-notes"
            rows={3}
            placeholder="Describe observations, mobility notes, or questions for the doctor verbatim..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('notes')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={checkInMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={checkInMutation.isPending}
            loadingText="Recording…"
          >
            Record check-in
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
