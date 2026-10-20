import { useAuthedSession } from '@/hooks/useSession';
import { Avatar } from '../common/Avatar';

/**
 * Shows the active care circle and recipient exactly as the server reports them. Switching
 * circles needs a backend endpoint that the spec does not define (see Missing endpoints).
 */
export function CircleChip() {
  const { circle } = useAuthedSession();

  if (!circle) {
    return (
      <p className="min-w-0 truncate rounded-full bg-navy-50 px-4 py-2 text-base font-bold text-ink-soft">
        No care circle yet
      </p>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-full bg-navy-50 py-1 pl-1 pr-4">
      <Avatar name={circle.recipientName} />
      <p className="min-w-0 leading-tight">
        <span className="block truncate text-sm text-ink-muted">Caring for</span>
        <span className="block truncate font-bold">{circle.recipientName}</span>
      </p>
    </div>
  );
}
