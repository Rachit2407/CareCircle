import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { cn } from '@/utils/cn';

interface NavListProps {
  /** Accessible name of the navigation landmark. */
  label: string;
  tone: 'dark' | 'light';
  onNavigate?: () => void;
}

const TONES = {
  dark: 'text-navy-100 hover:bg-navy-700',
  light: 'text-ink hover:bg-navy-100',
} as const;

/** Shared by the desktop sidebar and the mobile "More" sheet. Active state is aria-current. */
export function NavList({ label, tone, onNavigate }: NavListProps) {
  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center gap-3 rounded-full px-4 text-lg font-bold transition-colors',
                    isActive ? 'bg-marigold-400 text-navy-900' : TONES[tone],
                  )
                }
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
