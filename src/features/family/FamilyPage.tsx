import { Check, Mail, Phone, Plus, ShieldAlert, ShieldCheck, User, UsersRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { relationshipService } from '@/services/relationshipService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { RelationshipDialog } from './RelationshipDialog';
import type { CareRelationship } from '@/schemas/relationships';

export function FamilyPage() {
  const { user, circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);

  const relationshipsQuery = useQuery({
    queryKey: ['relationships'],
    queryFn: () => relationshipService.list(),
  });

  const toggleConsentMutation = useMutation({
    mutationFn: ({ id, consentStatus }: { id: string; consentStatus: 'active' | 'revoked' }) =>
      relationshipService.update(id, { consentStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationships'] });
      toast.show('relationship_updated');
    },
  });

  const relationships = relationshipsQuery.data ?? [];
  const recipientName = circle?.recipientName || 'Your Care Recipient';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Circle"
        description={`Authorized caregivers and family support network coordinating care for ${recipientName}.`}
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            <span>Connect member</span>
          </Button>
        }
      />

      {/* Scoping and Consent Transparency Banner */}
      <div className="flex items-start gap-3 rounded-bubble border border-line bg-paper p-5 shadow-soft">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-navy-800" />
        <div className="space-y-1 text-sm text-ink-soft">
          <p className="font-bold text-ink">Patient Privacy & Consent Rules</p>
          <p>
            Every care relationship is governed by active consent. Authorized caregivers can only
            view and manage records, tasks, and medications within their granted permissions.
          </p>
        </div>
      </div>

      {/* Care Recipient Card */}
      <div className={cn(ui.surface.saved, 'p-6')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={recipientName} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold">{recipientName}</h2>
              <span className="rounded-full bg-marigold-100 px-3 py-0.5 text-xs font-bold text-navy-900">
                Care Recipient
              </span>
            </div>
            <p className="text-sm text-ink-soft">Primary care scope • Timezone: {user.timeZone}</p>
          </div>
        </div>
      </div>

      {/* Relationships / Members Grid */}
      <div>
        <h3 className="mb-4 font-display text-xl font-bold">Authorized Caregivers & Members</h3>

        {relationshipsQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full rounded-bubble" />
            <Skeleton className="h-44 w-full rounded-bubble" />
          </div>
        ) : relationships.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No connected caregivers"
            description="Invite family members, doctors, or trusted caregivers to coordinate daily responsibilities."
            action={
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus aria-hidden="true" className="h-5 w-5" />
                <span>Add first connection</span>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {relationships.map((rel: CareRelationship) => (
              <div
                key={rel.id}
                className={cn(
                  ui.surface.saved,
                  'flex flex-col justify-between p-6 transition-shadow hover:shadow-lift',
                  rel.consentStatus === 'revoked' && 'opacity-60 bg-navy-50/40',
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 font-bold text-navy-800">
                        <User aria-hidden="true" className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-display text-lg font-bold">{rel.caregiverName}</h4>
                        <p className="text-sm font-semibold text-navy-700">
                          {rel.relationshipType}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={rel.consentStatus} />
                  </div>

                  <div className="space-y-1 text-xs text-ink-muted">
                    {rel.caregiverEmail && (
                      <p className="flex items-center gap-1.5">
                        <Mail aria-hidden="true" className="h-3.5 w-3.5 text-navy-700" />
                        <span>{rel.caregiverEmail}</span>
                      </p>
                    )}
                    {rel.caregiverPhone && (
                      <p className="flex items-center gap-1.5">
                        <Phone aria-hidden="true" className="h-3.5 w-3.5 text-navy-700" />
                        <span>{rel.caregiverPhone}</span>
                      </p>
                    )}
                  </div>

                  {rel.notes && (
                    <p className="text-xs text-ink-soft italic">&ldquo;{rel.notes}&rdquo;</p>
                  )}

                  {/* Permissions pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rel.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800"
                      >
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Consent Status Action */}
                <div className="mt-5 border-t border-line pt-3 flex justify-end">
                  {rel.consentStatus === 'active' ? (
                    <Button
                      size="md"
                      variant="ghost"
                      loading={toggleConsentMutation.isPending}
                      onClick={() =>
                        toggleConsentMutation.mutate({ id: rel.id, consentStatus: 'revoked' })
                      }
                    >
                      <ShieldAlert aria-hidden="true" className="h-4 w-4 text-warning-fg" />
                      <span>Revoke consent</span>
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      variant="secondary"
                      loading={toggleConsentMutation.isPending}
                      onClick={() =>
                        toggleConsentMutation.mutate({ id: rel.id, consentStatus: 'active' })
                      }
                    >
                      <Check aria-hidden="true" className="h-4 w-4" />
                      <span>Re-activate consent</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RelationshipDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
