import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { AssistantPage } from '@/features/assistant/AssistantPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { MedicationsPage } from '@/features/medications/MedicationsPage';
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage';
import { CareNotesPage } from '@/features/care-notes/CareNotesPage';
import { FamilyPage } from '@/features/family/FamilyPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard, PublicOnly } from './guards';
import { NotFoundPage } from './NotFoundPage';
import { LANDING_ROUTE, ROUTES } from './routes';

/** Developer-only. Vite removes this (and the lazy import) from production builds. */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: ROUTES.kit,
        lazy: async () => ({ Component: (await import('@/features/dev-kit/KitPage')).KitPage }),
      },
    ]
  : [];

/**
 * All primary application pages registered under AuthGuard with the shared AppShell layout.
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={LANDING_ROUTE} replace /> },
  {
    element: <PublicOnly />,
    children: [
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.register, element: <RegisterPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.assistant, element: <AssistantPage /> },
          { path: ROUTES.tasks, element: <TasksPage /> },
          { path: ROUTES.taskNew, element: <TasksPage /> },
          { path: ROUTES.medications, element: <MedicationsPage /> },
          { path: ROUTES.appointments, element: <AppointmentsPage /> },
          { path: ROUTES.appointmentNew, element: <AppointmentsPage /> },
          { path: ROUTES.careNotes, element: <CareNotesPage /> },
          { path: ROUTES.careNoteNew, element: <CareNotesPage /> },
          { path: ROUTES.family, element: <FamilyPage /> },
          { path: ROUTES.notifications, element: <NotificationsPage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
          ...devRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
