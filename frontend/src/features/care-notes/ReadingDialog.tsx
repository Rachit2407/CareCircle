import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { createHealthReadingInputSchema, type CreateHealthReadingInput } from '@/schemas/records';
import { recordService } from '@/services/recordService';

interface ReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNIT_MAP: Record<string, string> = {
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg',
  heart_rate: 'bpm',
  blood_glucose: 'mg/dL',
  weight: 'kg',
  oxygen_saturation: '%',
  temperature: '°F',
  respiratory_rate: 'breaths/min',
  other: 'units',
};

export function ReadingDialog({ open, onOpenChange }: ReadingDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  const form = useForm<CreateHealthReadingInput>({
    resolver: zodResolver(createHealthReadingInputSchema),
    defaultValues: {
      patientId,
      type: 'blood_pressure_systolic',
      value: 120,
      unit: 'mmHg',
      measuredAt: new Date().toISOString(),
      source: 'caregiver_entry',
      notes: '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: CreateHealthReadingInput) => recordService.createHealthReading(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['health-readings'] });
      toast.show('health_reading_saved');
      onOpenChange(false);
      form.reset();
    },
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value as CreateHealthReadingInput['type'];
    form.setValue('type', nextType);
    form.setValue('unit', UNIT_MAP[nextType] || 'units');
  };

  const onSubmit = form.handleSubmit((values) => {
    saveMutation.mutate({
      ...values,
      patientId,
    });
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record health reading"
      description="Enter vitals such as blood pressure, glucose, heart rate, or temperature measured at home."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reading-type" className="block text-base font-bold text-ink">
            Reading type
          </label>
          <select
            id="reading-type"
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
            defaultValue="blood_pressure_systolic"
            onChange={handleTypeChange}
          >
            <option value="blood_pressure_systolic">Blood pressure (Systolic) — mmHg</option>
            <option value="blood_pressure_diastolic">Blood pressure (Diastolic) — mmHg</option>
            <option value="heart_rate">Heart rate (Pulse) — bpm</option>
            <option value="blood_glucose">Blood glucose — mg/dL</option>
            <option value="weight">Body weight — kg</option>
            <option value="oxygen_saturation">Oxygen saturation (SpO2) — %</option>
            <option value="temperature">Body temperature — °F</option>
            <option value="respiratory_rate">Respiratory rate — breaths/min</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Numeric value"
            type="number"
            step="any"
            required
            error={errors.value?.message}
            {...form.register('value', { valueAsNumber: true })}
          />

          <TextField
            label="Unit"
            required
            readOnly
            error={errors.unit?.message}
            {...form.register('unit')}
          />
        </div>

        <TextField
          label="Measured at"
          type="datetime-local"
          required
          defaultValue={new Date().toISOString().slice(0, 16)}
          onChange={(e) => {
            const iso = new Date(e.target.value).toISOString();
            form.setValue('measuredAt', iso);
          }}
        />

        <div className="space-y-1.5">
          <label htmlFor="reading-notes" className="block text-base font-bold text-ink">
            Context notes <span className="text-sm font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="reading-notes"
            rows={2}
            placeholder="e.g. Measured before breakfast after 10 minutes rest..."
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
            loadingText="Saving reading…"
          >
            Save reading
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
