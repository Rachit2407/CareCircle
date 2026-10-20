import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
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
 * Only routes that exist are registered. Later phases add their feature routes here; anything
 * else inside the shell is a real 404, not a placeholder page.
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
        children: [...devRoutes, { path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
]);
