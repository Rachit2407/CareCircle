import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/common/ErrorState';
import { FullPageLoading } from '@/components/common/FullPageLoading';
import {
  SESSION_END_KEY,
  SessionProvider,
  useSession,
  type SessionEndReason,
} from '@/hooks/useSession';
import { toSafeReturnPath } from '@/utils/safePath';
import { LANDING_ROUTE, ROUTES } from './routes';

/**
 * The only auth guard. Signed-out and expired sessions go to /login with the return path in
 * router state (never in the URL). After an explicit sign-out there is no return path.
 */
export function AuthGuard() {
  const session = useSession();
  const location = useLocation();
  const queryClient = useQueryClient();

  if (session.data === undefined) {
    if (session.isError) {
      return (
        <main id="main" className="mx-auto grid min-h-dvh max-w-xl place-items-center p-6">
          <ErrorState
            error={session.error}
            onRetry={() => void session.refetch()}
            retrying={session.isFetching}
          />
        </main>
      );
    }
    return <FullPageLoading />;
  }

  if (session.data === null) {
    const reason = queryClient.getQueryData<SessionEndReason>(SESSION_END_KEY);
    const from = reason === 'signed_out' ? null : `${location.pathname}${location.search}`;
    return <Navigate to={ROUTES.login} replace state={{ from }} />;
  }

  return (
    <SessionProvider value={session.data}>
      <Outlet />
    </SessionProvider>
  );
}

/** Wraps /login and /register: signed-in users are sent on to where they were headed. */
export function PublicOnly() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) return <FullPageLoading />;
  if (session.data) {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={toSafeReturnPath(from, LANDING_ROUTE)} replace />;
  }
  return <Outlet />;
}
