import { AlertTriangle, Bell, Check, Clock, Info, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthedSession } from '@/hooks/useSession';
import { alertService } from '@/services/alertService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';
import { SendAlertDialog } from './SendAlertDialog';

export function NotificationsPage() {
  const { user } = useAuthedSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const auditQuery = useQuery({
    queryKey: ['audit'],
    queryFn: () => alertService.listAudit({ limit: 50 }),
  });

  const events = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);

  const handleMarkAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const handleMarkAllAsRead = () => {
    setReadIds(new Set(events.map((e) => e.id)));
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (severityFilter === 'unread') {
        return !readIds.has(ev.id);
      }
      return true;
    });
  }, [events, severityFilter, readIds]);

  const unreadCount = events.filter((e) => !readIds.has(e.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Care circle activity stream, urgent caregiver dispatches, and delivery status logs."
        action={
          <div className="flex flex-wrap gap-3">
            {unreadCount > 0 && (
              <Button variant="ghost" onClick={handleMarkAllAsRead}>
                <Check aria-hidden="true" className="h-4 w-4" />
                <span>Mark all as read</span>
              </Button>
            )}
            <Button variant="danger" onClick={() => setDialogOpen(true)}>
              <Send aria-hidden="true" className="h-4 w-4" />
              <span>Send alert</span>
            </Button>
          </div>
        }
      />

      {/* Reminder Delivery Clarification */}
      <div className="rounded-bubble border border-line bg-paper p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-800" />
          <div className="space-y-1 text-sm text-ink-soft">
            <p className="font-bold text-ink">Notification Architecture & Delivery Distinction</p>
            <p>
              Notifications represent automated dispatch logs (voice calls, SMS, push alerts) and
              audit milestones across the care circle. Reminder delivery status is managed
              independently by backend queues and distinct from medication dose consumption
              confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-xl bg-navy-50 p-1">
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
              severityFilter === 'all'
                ? 'bg-paper text-navy-900 shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            All notifications ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('unread')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-bold transition-colors',
              severityFilter === 'unread'
                ? 'bg-paper text-navy-900 shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            Unread only ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications / Activity Stream */}
      {auditQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-bubble" />
          <Skeleton className="h-20 w-full rounded-bubble" />
          <Skeleton className="h-20 w-full rounded-bubble" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You are all caught up! New alerts, reminders, and care activities will appear here in real-time."
          action={
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              <span>Send a test alert</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const isRead = readIds.has(event.id);
            const isAlert = event.action.includes('ALERT');

            return (
              <div
                key={event.id}
                className={cn(
                  ui.surface.saved,
                  'flex flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-lift sm:flex-row sm:items-center',
                  !isRead && 'border-l-4 border-l-marigold-400',
                  isAlert && 'border-danger-border bg-danger-bg/20',
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isAlert
                        ? 'bg-danger-fg text-paper'
                        : isRead
                          ? 'bg-navy-50 text-navy-800'
                          : 'bg-marigold-100 text-marigold-700',
                    )}
                  >
                    {isAlert ? (
                      <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Bell aria-hidden="true" className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{event.action.replace(/_/g, ' ')}</p>
                      <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                        {event.result}
                      </span>
                      {!isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-marigold-400"
                          aria-label="Unread notification"
                        />
                      )}
                    </div>

                    <p className="text-sm text-ink-soft">
                      Triggered by: <span className="font-semibold">{event.actorName}</span>
                      {event.targetType ? ` • Target: ${event.targetType.replace(/_/g, ' ')}` : ''}
                    </p>

                    <p className="flex items-center gap-1 text-xs text-ink-muted">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                      <time dateTime={event.createdAt}>
                        {formatDateTime(event.createdAt, user.timeZone)}
                      </time>
                    </p>
                  </div>
                </div>

                {!isRead && (
                  <Button size="md" variant="ghost" onClick={() => handleMarkAsRead(event.id)}>
                    <span>Dismiss</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Send Alert Modal */}
      <SendAlertDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
