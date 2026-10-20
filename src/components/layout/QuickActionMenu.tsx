import { QUICK_ACTION_ICON, QUICK_ACTIONS } from '@/app/navigation';
import { Button } from '../ui/Button';
import { Menu, type MenuItem } from '../ui/Menu';

const ITEMS: readonly MenuItem[] = QUICK_ACTIONS.map((action) => ({ kind: 'link', ...action }));

/** Global quick action from spec section 2: create a task, appointment or note, or ask. */
export function QuickActionMenu() {
  const Icon = QUICK_ACTION_ICON;
  return (
    <Menu
      label="Quick actions"
      items={ITEMS}
      trigger={
        <Button aria-label="New: create or ask">
          <Icon aria-hidden="true" className="h-5 w-5" />
          <span className="hidden sm:inline">New</span>
        </Button>
      }
    />
  );
}
