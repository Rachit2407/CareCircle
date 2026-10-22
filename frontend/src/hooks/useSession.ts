import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { authService } from '@/services/authService';
import type { Session } from '@/types/session';

export const SESSION_KEY = ['session'] as const;
/** Why the last session ended. Lets the guard skip the return path after an explicit sign-out. */
export const SESSION_END_KEY = ['session-end'] as const;
export type SessionEndReason = 'expired' | 'signed_out';

/** Data is `Session` when signed in and `null` when not. Identity comes from the server only. */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: ({ signal }) => authService.getSession(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

const SessionContext = createContext<Session | null>(null);
export const SessionProvider = SessionContext.Provider;

/** For components rendered inside the auth guard, where a session is guaranteed. */
export function useAuthedSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAuthedSession must be used inside the auth guard.');
  return session;
}
