import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  MapPin,
  Pencil,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { appointmentService } from '@/services/appointmentService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';
import { AppointmentDialog } from './AppointmentDialog';
import { CheckInDialog } from './CheckInDialog';
import type { Appointment, AppointmentStatus } from '@/schemas/appointments';

export function AppointmentsPage() {
  const { user } = useAuthedSession();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isNewRoute = location.pathname.endsWith('/new');
  const [dialogOpen, setDialogOpen] = useState(isNewRoute);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedForCheckIn, setSelectedForCheckIn] = useState<Appointment | null>(null);

  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tab],
    queryFn: () => appointmentService.list({ upcomingOnly: tab === 'upcoming' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentService.update(id, { status }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.show(
        variables.status === 'cancelled' ? 'appointment_cancelled' : 'appointment_updated',
      );
    },
  });

  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesProvider = apt.provider.toLowerCase().includes(q);
        const matchesLocation = apt.location.toLowerCase().includes(q);
        const matchesSpecialty = apt.specialty?.toLowerCase().includes(q) ?? false;
        if (!matchesProvider && !matchesLocation && !matchesSpecialty) return false;
      }
      return true;
    });
  }, [appointments, search]);

  const handleOpenAdd = () => {
    setAppointmentToEdit(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (apt: Appointment) => {
    setAppointmentToEdit(apt);
    setDialogOpen(true);
  };

  const handleOpenCheckIn = (apt: Appointment) => {
    setSelectedForCheckIn(apt);
    setCheckInOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Doctor consultations, hospital visits, telehealth checkups, and pre-visit logs."
        action={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            <span>Schedule appointment</span>
          </Button>
        }
      />

      {/* Tabs and Search Bar */}
      <div className={cn(ui.surface.saved, 'p-4 md:p-5')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl bg-navy-50 p-1">
            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
                tab === 'upcoming'
                  ? 'bg-paper text-navy-900 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              Upcoming visits
            </button>
            <button
              type="button"
              onClick={() => setTab('all')}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
                tab === 'all'
                  ? 'bg-paper text-navy-900 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              All appointments
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search provider, location…"
              className="h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-navy-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {appointmentsQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-bubble" />
          <Skeleton className="h-28 w-full rounded-bubble" />
        </div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments scheduled"
          description={
            tab === 'upcoming'
              ? 'No upcoming appointments found. Schedule a clinic visit, telehealth session, or checkup.'
              : 'No appointments match your search criteria.'
          }
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus aria-hidden="true" className="h-5 w-5" />
              <span>Schedule appointment</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className={cn(
                ui.surface.saved,
                'flex flex-col justify-between gap-5 p-6 transition-shadow hover:shadow-lift lg:flex-row lg:items-center',
                apt.status === 'cancelled' && 'opacity-65 bg-navy-50/40',
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold">{apt.provider}</h3>
                  <StatusBadge status={apt.status as AppointmentStatus} />
                  {apt.specialty && (
                    <span className="rounded-full bg-navy-100 px-3 py-0.5 text-xs font-bold text-navy-800">
                      {apt.specialty}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1 font-bold text-navy-800">
                    <Calendar aria-hidden="true" className="h-4 w-4" />
                    <time dateTime={apt.startsAt}>
                      {formatDateTime(apt.startsAt, user.timeZone)}
                    </time>
                  </span>
                  <span className="inline-flex items-center gap-1 text-ink-muted">
                    <MapPin aria-hidden="true" className="h-4 w-4 text-navy-700" />
                    {apt.location}
                  </span>
                </div>

                {apt.notes && (
                  <p className="text-sm text-ink-muted">Instructions: &ldquo;{apt.notes}&rdquo;</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {apt.status === 'scheduled' && (
                  <>
                    <Button size="md" variant="primary" onClick={() => handleOpenCheckIn(apt)}>
                      <HeartPulse aria-hidden="true" className="h-4 w-4" />
                      <span>Pre-visit check-in</span>
                    </Button>

                    <Button
                      size="md"
                      variant="ghost"
                      loading={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ id: apt.id, status: 'completed' })
                      }
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success-fg" />
                      <span>Done</span>
                    </Button>

                    <Button
                      size="md"
                      variant="ghost"
                      loading={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ id: apt.id, status: 'cancelled' })
                      }
                    >
                      <XCircle aria-hidden="true" className="h-4 w-4 text-danger-fg" />
                      <span>Cancel</span>
                    </Button>
                  </>
                )}

                <Button
                  size="md"
                  variant="ghost"
                  aria-label={`Edit appointment with ${apt.provider}`}
                  onClick={() => handleOpenEdit(apt)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Creation & Edit Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointmentToEdit={appointmentToEdit}
      />

      {/* Check-In Dialog */}
      <CheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        appointmentId={selectedForCheckIn?.id}
        providerName={selectedForCheckIn?.provider}
      />
    </div>
  );
}
