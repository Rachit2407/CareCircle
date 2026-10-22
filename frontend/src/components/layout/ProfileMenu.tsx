import { LogOut, Settings } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthedSession } from '@/hooks/useSession';
import { Avatar } from '../common/Avatar';
import { Menu } from '../ui/Menu';

export function ProfileMenu() {
  const { user } = useAuthedSession();
  const signOut = useSignOut();

  return (
    <Menu
      label="Account"
      items={[
        { kind: 'link', to: ROUTES.settings, label: 'Settings', icon: Settings },
        {
          kind: 'action',
          label: signOut.isPending ? 'Signing out…' : 'Sign out',
          icon: LogOut,
          disabled: signOut.isPending,
          onSelect: () => signOut.mutate(),
        },
      ]}
      trigger={
        <button
          type="button"
          aria-label={`Account menu for ${user.displayName}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
        >
          <Avatar name={user.displayName} className="h-11 w-11" />
        </button>
      }
    />
  );
}
