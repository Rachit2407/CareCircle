import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { useAuthedSession } from '@/hooks/useSession';
import { useNow } from '@/hooks/useNow';
import { alertService } from '@/services/alertService';
import { minutesIntoDay } from '@/utils/datetime';
import { BrandMark } from '../common/BrandMark';
import { DayPartBar } from '../common/DayPartBar';
import { CircleChip } from './CircleChip';
import { DayClock } from './DayClock';
import { ProfileMenu } from './ProfileMenu';
import { QuickActionMenu } from './QuickActionMenu';

/** Circle selector, notifications entry, quick actions and profile, over the day-part ribbon. */
export function Header() {
  const { user } = useAuthedSession();
  const now = useNow(30_000);

  const auditQuery = useQuery({
    queryKey: ['audit'],
    queryFn: () => alertService.listAudit({ limit: 10 }),
    staleTime: 60_000,
  });
  const unreadCount = auditQuery.data?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8">
        <BrandMark className="h-9 w-9 shrink-0 md:hidden" />
        <CircleChip />
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <div className="hidden text-right sm:block">
            <DayClock now={now} timeZone={user.timeZone} />
          </div>
          <Link
            to={ROUTES.notifications}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} updates)` : ''}`}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-navy-800 hover:bg-navy-100"
          >
            <Bell aria-hidden="true" className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-marigold-400 px-1 text-[10px] font-bold text-navy-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <QuickActionMenu />
          <ProfileMenu />
        </div>
      </div>
      <div className="px-4 pb-1.5 text-center sm:hidden">
        <DayClock now={now} timeZone={user.timeZone} />
      </div>
      <DayPartBar minutesIntoDay={minutesIntoDay(now, user.timeZone)} />
    </header>
  );
}
