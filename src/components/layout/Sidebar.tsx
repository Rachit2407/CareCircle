import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { BrandMark } from '../common/BrandMark';
import { NavList } from './NavList';

export function Sidebar() {
  return (
    <aside
      data-on-dark
      className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto rounded-r-bubble bg-navy-900 p-5 text-paper md:flex"
    >
      <Link to={ROUTES.dashboard} className="flex items-center gap-3 rounded-full px-2 py-1">
        <BrandMark className="h-10 w-10" />
        <span className="font-display text-2xl font-bold">CareCircle</span>
      </Link>
      <NavList label="Primary" tone="dark" />
    </aside>
  );
}
