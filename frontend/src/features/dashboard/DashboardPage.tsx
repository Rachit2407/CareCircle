import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  ListChecks,
  Mic,
  Pill,
  Plus,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { appointmentService } from '@/services/appointmentService';
import { medicationService } from '@/services/medicationService';
import { recordService } from '@/services/recordService';
import { taskService } from '@/services/taskService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';

export function DashboardPage() {
  const { user, circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const recipientName = circle?.recipientName || 'Your Care Recipient';

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.list(),
  });

  const medsQuery = useQuery({
    queryKey: ['medications', 'schedule'],
    queryFn: () => medicationService.list({ activeOnly: true }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointmentService.list({ upcomingOnly: true }),
  });

  const readingsQuery = useQuery({
    queryKey: ['health-readings'],
    queryFn: () => recordService.listHealthReadings({ limit: '5' }),
  });

  const checkInsQuery = useQuery({
    queryKey: ['check-ins'],
    queryFn: () => recordService.listCheckIns({ limit: '1' }),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.update(id, { status: 'completed' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.show('task_completed');
    },
  });

  const allTasks = tasksQuery.data ?? [];
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const pendingTasks = allTasks.filter((t) => t.status === 'pending');
  const taskProgress =
    allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  const schedules = medsQuery.data ?? [];
  const activeSchedules = schedules.filter((s) => s.active);

  const appointments = appointmentsQuery.data ?? [];
  const nextAppointment = appointments[0] ?? null;

  const readings = readingsQuery.data ?? [];
  const latestSystolic = readings.find((r) => r.type === 'blood_pressure_systolic');
  const latestDiastolic = readings.find((r) => r.type === 'blood_pressure_diastolic');
  const latestHeartRate = readings.find((r) => r.type === 'heart_rate');

  const checkIns = checkInsQuery.data ?? [];
  const latestCheckIn = checkIns[0] ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user.displayName}`}
        description={`Today's care overview and coordination for ${recipientName}.`}
        action={
          <div className="flex flex-wrap gap-3">
            <ButtonLink to={ROUTES.taskNew} variant="primary">
              <Plus aria-hidden="true" className="h-5 w-5" />
              <span>New task</span>
            </ButtonLink>
            <ButtonLink to={ROUTES.assistant} variant="secondary">
              <Mic aria-hidden="true" className="h-5 w-5" />
              <span>Ask assistant</span>
            </ButtonLink>
          </div>
        }
      />

      {/* Summary Metrics Grid */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className={cn(ui.surface.saved, 'flex flex-col justify-between p-5')}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-muted">Tasks pending</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-800">
              <ListChecks aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            {tasksQuery.isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="font-display text-3xl font-bold">{pendingTasks.length}</p>
            )}
            <p className="mt-1 text-sm text-ink-soft">
              {allTasks.length > 0
                ? `${completedTasks.length} of ${allTasks.length} completed (${taskProgress}%)`
                : 'No tasks scheduled'}
            </p>
          </div>
        </div>

        <div className={cn(ui.surface.saved, 'flex flex-col justify-between p-5')}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-muted">Active medications</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marigold-50 text-marigold-700">
              <Pill aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            {medsQuery.isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="font-display text-3xl font-bold">{activeSchedules.length}</p>
            )}
            <p className="mt-1 text-sm text-ink-soft">
              {activeSchedules.length > 0 ? 'Daily schedules active' : 'No active prescriptions'}
            </p>
          </div>
        </div>

        <div className={cn(ui.surface.saved, 'flex flex-col justify-between p-5')}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-muted">Next appointment</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-800">
              <CalendarDays aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            {appointmentsQuery.isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : nextAppointment ? (
              <>
                <p className="truncate font-display text-xl font-bold">
                  {nextAppointment.provider}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  <time dateTime={nextAppointment.startsAt}>
                    {formatDateTime(nextAppointment.startsAt, user.timeZone)}
                  </time>
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold">None scheduled</p>
                <p className="mt-1 text-sm text-ink-soft">Routine check-ups up to date</p>
              </>
            )}
          </div>
        </div>

        <div className={cn(ui.surface.saved, 'flex flex-col justify-between p-5')}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-muted">Recent vitals</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-800">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            {readingsQuery.isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : latestSystolic && latestDiastolic ? (
              <>
                <p className="font-display text-3xl font-bold">
                  {latestSystolic.value}/{latestDiastolic.value}{' '}
                  <span className="text-sm font-normal text-ink-muted">mmHg</span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {latestHeartRate ? `Pulse: ${latestHeartRate.value} bpm` : 'Normal range'}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold">No readings</p>
                <p className="mt-1 text-sm text-ink-soft">Record vitals in Care Notes</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols): Tasks & Medications */}
        <div className="space-y-8 lg:col-span-2">
          {/* Today's Tasks */}
          <section aria-labelledby="today-tasks-heading" className={cn(ui.surface.saved, 'p-6')}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="today-tasks-heading" className="font-display text-2xl font-bold">
                  Care tasks
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {completedTasks.length} of {allTasks.length} tasks completed
                </p>
              </div>
              <Link
                to={ROUTES.tasks}
                className="inline-flex items-center gap-1 text-sm font-bold text-navy-700 hover:text-navy-900"
              >
                View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            {/* Progress Bar */}
            {allTasks.length > 0 && (
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-navy-50">
                <div
                  className="h-full bg-marigold-400 transition-all duration-300"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
            )}

            <div className="mt-6 divide-y divide-line">
              {tasksQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : allTasks.length === 0 ? (
                <p className="py-6 text-center text-ink-muted">No care tasks assigned for today.</p>
              ) : (
                allTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-bold',
                          task.status === 'completed' && 'line-through text-ink-muted',
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                        <span>Due: {formatDateTime(task.dueAt, user.timeZone)}</span>
                        <StatusBadge status={task.priority} />
                      </div>
                    </div>
                    {task.status !== 'completed' ? (
                      <Button
                        size="md"
                        variant="ghost"
                        loading={completeTaskMutation.isPending}
                        onClick={() => completeTaskMutation.mutate(task.id)}
                        aria-label={`Mark task completed: ${task.title}`}
                      >
                        <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success-fg" />
                        <span className="hidden sm:inline">Done</span>
                      </Button>
                    ) : (
                      <StatusBadge status="completed" />
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Medication Schedules */}
          <section aria-labelledby="meds-schedule-heading" className={cn(ui.surface.saved, 'p-6')}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="meds-schedule-heading" className="font-display text-2xl font-bold">
                  Medication schedule
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Active prescription regimens</p>
              </div>
              <Link
                to={ROUTES.medications}
                className="inline-flex items-center gap-1 text-sm font-bold text-navy-700 hover:text-navy-900"
              >
                Manage schedules <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 divide-y divide-line">
              {medsQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : activeSchedules.length === 0 ? (
                <p className="py-6 text-center text-ink-muted">
                  No active medication schedules recorded.
                </p>
              ) : (
                activeSchedules.slice(0, 3).map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{schedule.medicationName}</p>
                      <p className="text-sm text-ink-soft">
                        {schedule.dosage} • {schedule.recurrence.frequency.replace('_', ' ')} (
                        {schedule.recurrence.times.join(', ')})
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">{schedule.instructions}</p>
                    </div>
                    <ButtonLink to={ROUTES.medications} variant="secondary" size="md">
                      Dose check
                    </ButtonLink>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Next Appointment & Check-In State & Assistant prompt */}
        <div className="space-y-8">
          {/* Next Appointment Card */}
          <section aria-labelledby="next-apt-heading" className={cn(ui.surface.saved, 'p-6')}>
            <h2 id="next-apt-heading" className="font-display text-xl font-bold">
              Upcoming appointment
            </h2>
            {appointmentsQuery.isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ) : nextAppointment ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-navy-50 p-4">
                  <p className="text-lg font-bold">{nextAppointment.provider}</p>
                  {nextAppointment.specialty && (
                    <p className="text-sm text-ink-soft">{nextAppointment.specialty}</p>
                  )}
                  <p className="mt-2 text-sm font-bold text-navy-800">
                    <time dateTime={nextAppointment.startsAt}>
                      {formatDateTime(nextAppointment.startsAt, user.timeZone)}
                    </time>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{nextAppointment.location}</p>
                </div>
                <ButtonLink to={ROUTES.appointments} variant="secondary" className="w-full">
                  All appointments
                </ButtonLink>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-sm text-ink-muted">No upcoming appointments scheduled.</p>
                <ButtonLink to={ROUTES.appointmentNew} variant="secondary" className="mt-4 w-full">
                  Schedule appointment
                </ButtonLink>
              </div>
            )}
          </section>

          {/* Daily Well-being Status */}
          <section aria-labelledby="daily-checkin-heading" className={cn(ui.surface.saved, 'p-6')}>
            <div className="flex items-center justify-between">
              <h2 id="daily-checkin-heading" className="font-display text-xl font-bold">
                Daily check-in
              </h2>
              <HeartPulse aria-hidden="true" className="h-5 w-5 text-navy-700" />
            </div>
            {latestCheckIn ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-success-bg px-3 py-1 text-sm font-bold text-success-fg">
                    Feeling {latestCheckIn.feeling}
                  </span>
                  <span className="text-sm text-ink-muted">Pain: {latestCheckIn.painScore}/10</span>
                </div>
                {latestCheckIn.notes && (
                  <p className="text-sm text-ink-soft italic">
                    &ldquo;{latestCheckIn.notes}&rdquo;
                  </p>
                )}
                <p className="text-xs text-ink-muted">
                  Recorded{' '}
                  <time dateTime={latestCheckIn.createdAt}>
                    {formatDateTime(latestCheckIn.createdAt || '', user.timeZone)}
                  </time>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">No check-in recorded for today yet.</p>
            )}
            <ButtonLink to={ROUTES.careNotes} variant="secondary" className="mt-4 w-full">
              Record daily check-in
            </ButtonLink>
          </section>

          {/* Assistant Banner */}
          <div className={cn(ui.surface.ai, 'p-6')}>
            <div className="flex items-center gap-2">
              <span className={ui.aiBadge}>
                <Mic aria-hidden="true" className="h-4 w-4" />
                Assistant
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">
              Ask anything about care routines
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Quickly check medication timings, query pending tasks, or log observations by voice or
              text.
            </p>
            <ButtonLink to={ROUTES.assistant} variant="primary" className="mt-4 w-full">
              Open Care Assistant
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
