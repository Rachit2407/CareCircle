import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import {
  createRelationshipInputSchema,
  type CreateRelationshipInput,
} from '@/schemas/relationships';
import { relationshipService } from '@/services/relationshipService';

interface RelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RelationshipDialog({ open, onOpenChange }: RelationshipDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  const form = useForm<CreateRelationshipInput>({
    resolver: zodResolver(createRelationshipInputSchema),
    defaultValues: {
      patientId,
      caregiverId: '',
      relationshipType: 'Family Caregiver',
      permissions: ['all'],
      consentStatus: 'active',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateRelationshipInput) => relationshipService.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationships'] });
      toast.show('relationship_created');
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate({
      ...values,
      patientId,
    });
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add family or caregiver connection"
      description="Authorize a family member, nurse, or designated caregiver with scoped consent permissions."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Caregiver User ID / Account ID"
          required
          placeholder="e.g. usr_caregiver_id"
          error={errors.caregiverId?.message}
          {...form.register('caregiverId')}
        />

        <TextField
          label="Relationship to care recipient"
          required
          placeholder="e.g. Daughter, Son, Visiting Nurse, Primary Caregiver"
          error={errors.relationshipType?.message}
          {...form.register('relationshipType')}
        />

        <div className="space-y-1.5">
          <label htmlFor="consent-status" className="block text-base font-bold text-ink">
            Consent status
          </label>
          <select
            id="consent-status"
            className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
            {...form.register('consentStatus')}
          >
            <option value="active">Active (Full authorized access)</option>
            <option value="pending">Pending (Awaiting recipient confirmation)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rel-notes" className="block text-base font-bold text-ink">
            Care coordination notes
          </label>
          <textarea
            id="rel-notes"
            rows={2}
            placeholder="e.g. Responsible for morning visits and weekend transport..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:border-navy-700"
            {...form.register('notes')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={createMutation.isPending}
            loadingText="Connecting…"
          >
            Establish connection
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
