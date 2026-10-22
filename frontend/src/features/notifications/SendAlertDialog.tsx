import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { createAlertInputSchema, type CreateAlertInput } from '@/schemas/alerts';
import { alertService } from '@/services/alertService';

type DispatchChannel = 'push' | 'sms' | 'voice_sarvam' | 'email';

interface SendAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendAlertDialog({ open, onOpenChange }: SendAlertDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';
  const [selectedChannels, setSelectedChannels] = useState<DispatchChannel[]>(['push']);

  const form = useForm<CreateAlertInput>({
    resolver: zodResolver(createAlertInputSchema),
    defaultValues: {
      patientId,
      severity: 'urgent',
      title: '',
      message: '',
      suggestedAction: '',
      channels: ['push'],
      source: 'manual',
    },
  });

  const sendMutation = useMutation({
    mutationFn: (values: CreateAlertInput) => alertService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['audit'] });
      toast.show('alert_dispatched');
      onOpenChange(false);
      form.reset();
    },
  });

  const toggleChannel = (ch: DispatchChannel) => {
    setSelectedChannels((prev) => {
      const next: DispatchChannel[] = prev.includes(ch)
        ? prev.filter((c) => c !== ch)
        : [...prev, ch];
      const valid: DispatchChannel[] = next.length > 0 ? next : ['push'];
      form.setValue('channels', valid);
      return valid;
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    sendMutation.mutate({
      ...values,
      patientId,
      channels: selectedChannels,
    });
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dispatch caregiver alert"
      description="Immediately notify authorized family circle members across push notification, SMS, or voice call."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="alert-severity" className="block text-base font-bold text-ink">
            Alert severity
          </label>
          <select
            id="alert-severity"
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
            {...form.register('severity')}
          >
            <option value="urgent">Urgent — Immediate family attention recommended</option>
            <option value="critical">Critical — High priority clinical event or fall</option>
            <option value="warning">Warning — Attention needed soon (e.g. missed dose)</option>
            <option value="info">Info — Informational update for the circle</option>
          </select>
        </div>

        <TextField
          label="Alert title"
          required
          placeholder="e.g. Assistance required with evening medication"
          error={errors.title?.message}
          {...form.register('title')}
        />

        <div className="space-y-1.5">
          <label htmlFor="alert-message" className="block text-base font-bold text-ink">
            Alert message
          </label>
          <textarea
            id="alert-message"
            required
            rows={3}
            placeholder="Provide context, details, and what needs immediate caregiver attention..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('message')}
          />
          {errors.message && <p className="text-sm text-danger-fg">{errors.message.message}</p>}
        </div>

        <TextField
          label="Suggested action"
          placeholder="e.g. Call Raghav or visit home to verify dose"
          error={errors.suggestedAction?.message}
          {...form.register('suggestedAction')}
        />

        <div className="space-y-2">
          <p id="channels-label" className="block text-base font-bold text-ink">
            Dispatch channels
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="channels-label">
            {[
              { id: 'push' as DispatchChannel, label: 'Push Notification' },
              { id: 'sms' as DispatchChannel, label: 'SMS Text' },
              { id: 'voice_sarvam' as DispatchChannel, label: 'Sarvam Voice Call' },
              { id: 'email' as DispatchChannel, label: 'Email' },
            ].map((ch) => {
              const active = selectedChannels.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-navy-900 text-paper'
                      : 'border border-line bg-navy-50 text-ink hover:bg-navy-100'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={sendMutation.isPending}
            loadingText="Dispatching…"
          >
            Dispatch alert
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
