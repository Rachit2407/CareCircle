import { Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { ROUTES } from '@/app/routes';
import { cn } from '@/utils/cn';
import { Dialog } from '../ui/Dialog';
import { NavList } from './NavList';

const BAR_ITEM = 'flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-bold';

/** Bottom bar for small screens: three key sections plus "More", which opens every section. */
export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.filter((item) => item.mobileBar).map((item) => {
            const Icon = item.icon;
            const emphasised = item.to === ROUTES.assistant;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(BAR_ITEM, isActive ? 'text-navy-900' : 'text-ink-soft')
                  }
                >
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full',
                      emphasised && 'bg-marigold-400 text-navy-900',
                    )}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  {item.label}
                </NavLink>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              className={cn(BAR_ITEM, 'w-full text-ink-soft')}
            >
              <span className="flex h-8 w-14 items-center justify-center">
                <Ellipsis aria-hidden="true" className="h-6 w-6" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
      <Dialog variant="sheet" open={moreOpen} onOpenChange={setMoreOpen} title="All sections">
        <NavList label="All sections" tone="light" onNavigate={() => setMoreOpen(false)} />
      </Dialog>
    </>
  );
}
