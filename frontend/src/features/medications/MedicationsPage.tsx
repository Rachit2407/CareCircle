import {
  AlertCircle,
  Bell,
  Check,
  Clock,
  Pause,
  Pencil,
  Pill,
  Play,
  Plus,
  UserCheck,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { medicationService } from '@/services/medicationService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { ConfirmDoseDialog } from './ConfirmDoseDialog';
import { ScheduleDialog } from './ScheduleDialog';
import type { MedicationSchedule } from '@/schemas/medications';

export function MedicationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<MedicationSchedule | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedForDose, setSelectedForDose] = useState<MedicationSchedule | null>(null);

  const [activeOnly, setActiveOnly] = useState(false);

  const schedulesQuery = useQuery({
    queryKey: ['medications', 'schedule', activeOnly],
    queryFn: () => medicationService.list({ activeOnly }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      medicationService.update(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
      toast.show('schedule_updated');
    },
  });

  const schedules = schedulesQuery.data ?? [];

  const handleOpenAdd = () => {
    setScheduleToEdit(null);
    setScheduleDialogOpen(true);
  };

  const handleOpenEdit = (schedule: MedicationSchedule) => {
    setScheduleToEdit(schedule);
    setScheduleDialogOpen(true);
  };

  const handleOpenDoseConfirm = (schedule: MedicationSchedule) => {
    setSelectedForDose(schedule);
    setConfirmDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medications"
        description="Prescription schedules, adherence dose confirmation, and automated reminder preferences."
        action={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            <span>Add schedule</span>
          </Button>
        }
      />

      {/* Clinical Disclaimer & Reminder Clarity Banner */}
      <div className="flex items-start gap-3 rounded-bubble border border-info-border bg-info-bg p-4 text-sm text-info-fg">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Important Distinction Regarding Medication Tracking</p>
          <p className="mt-0.5 text-xs">
            Prescription dosages and timings must reflect valid clinical orders. Automated reminder
            delivery status (voice call, push, or SMS dispatch) is tracked independently from actual
            patient dose consumption confirmation.
          </p>
        </div>
      </div>

      {/* Filter Control */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-xl bg-navy-50 p-1">
          <button
            type="button"
            onClick={() => setActiveOnly(false)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
              !activeOnly ? 'bg-paper text-navy-900 shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            All schedules ({schedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveOnly(true)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
              activeOnly ? 'bg-paper text-navy-900 shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            Active only
          </button>
        </div>
      </div>

      {/* Schedule List */}
      {schedulesQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-bubble" />
          <Skeleton className="h-32 w-full rounded-bubble" />
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medication schedules found"
          description="Track prescription regimens, reminder times, and daily dose verifications for family members."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus aria-hidden="true" className="h-5 w-5" />
              <span>Add medication schedule</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={cn(
                ui.surface.saved,
                'flex flex-col justify-between gap-5 p-6 transition-shadow hover:shadow-lift lg:flex-row lg:items-center',
                !schedule.active && 'opacity-70 bg-navy-50/40',
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold">{schedule.medicationName}</h3>
                  <StatusBadge status={schedule.active ? 'active' : 'paused'} />
                  <span className="rounded-full bg-marigold-100 px-3 py-0.5 text-sm font-bold text-navy-900">
                    {schedule.dosage}
                  </span>
                </div>

                <p className="text-base font-medium text-ink-soft">
                  Prescribed instruction: &ldquo;{schedule.instructions}&rdquo;
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1 font-semibold text-navy-800">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    {schedule.recurrence.frequency.replace('_', ' ')}:{' '}
                    {schedule.recurrence.times.join(', ')}
                  </span>
                  {schedule.prescribedBy && (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck aria-hidden="true" className="h-3.5 w-3.5" />
                      Prescribed by {schedule.prescribedBy}
                    </span>
                  )}
                  {schedule.reminderPreferences?.enabled && (
                    <span className="inline-flex items-center gap-1 text-info-fg font-medium">
                      <Bell aria-hidden="true" className="h-3.5 w-3.5" />
                      Reminders enabled ({schedule.reminderPreferences.advanceMinutes}m prior)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Button size="md" variant="primary" onClick={() => handleOpenDoseConfirm(schedule)}>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>Confirm dose</span>
                </Button>

                <Button
                  size="md"
                  variant="secondary"
                  loading={toggleActiveMutation.isPending}
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: schedule.id, active: !schedule.active })
                  }
                >
                  {schedule.active ? (
                    <>
                      <Pause aria-hidden="true" className="h-4 w-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play aria-hidden="true" className="h-4 w-4" />
                      <span>Resume</span>
                    </>
                  )}
                </Button>

                <Button
                  size="md"
                  variant="ghost"
                  aria-label={`Edit schedule: ${schedule.medicationName}`}
                  onClick={() => handleOpenEdit(schedule)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        scheduleToEdit={scheduleToEdit}
      />

      <ConfirmDoseDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        schedule={selectedForDose}
      />
    </div>
  );
}
