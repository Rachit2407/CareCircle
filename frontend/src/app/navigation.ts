import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Mic,
  NotebookPen,
  Pill,
  Plus,
  Settings,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar. Everything else is in the "More" sheet. */
  mobileBar?: boolean;
}

/** Every primary section from spec section 2, in display order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, mobileBar: true },
  { to: ROUTES.assistant, label: 'Assistant', icon: Mic, mobileBar: true },
  { to: ROUTES.tasks, label: 'Care tasks', icon: ListChecks, mobileBar: true },
  { to: ROUTES.medications, label: 'Medications', icon: Pill },
  { to: ROUTES.appointments, label: 'Appointments', icon: CalendarDays },
  { to: ROUTES.careNotes, label: 'Care notes', icon: NotebookPen },
  { to: ROUTES.family, label: 'Family circle', icon: UsersRound },
  { to: ROUTES.notifications, label: 'Notifications', icon: Bell },
  { to: ROUTES.settings, label: 'Settings', icon: Settings },
];

export const QUICK_ACTIONS: readonly { to: string; label: string; icon: LucideIcon }[] = [
  { to: ROUTES.taskNew, label: 'Create a task', icon: ListChecks },
  { to: ROUTES.appointmentNew, label: 'Add an appointment', icon: CalendarDays },
  { to: ROUTES.careNoteNew, label: 'Add a care note', icon: NotebookPen },
  { to: ROUTES.assistant, label: 'Ask the assistant', icon: Mic },
];

export const QUICK_ACTION_ICON: LucideIcon = Plus;
