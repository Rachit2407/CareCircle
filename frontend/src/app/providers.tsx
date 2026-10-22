import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { SESSION_END_KEY, SESSION_KEY } from '@/hooks/useSession';
import { setUnauthorizedHandler } from '@/services/api-client';
import { ApiError } from '@/services/api-error';

const RETRYABLE_READS = new Set(['server', 'timeout', 'offline']);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Fail visibly when offline instead of pausing silently.
      networkMode: 'always',
      retry: (failureCount, error) =>
        failureCount < 1 && error instanceof ApiError && RETRYABLE_READS.has(error.kind),
    },
    // Writes are never retried and never paused-and-resumed: that would be a blind resubmission.
    mutations: { networkMode: 'always', retry: false },
  },
});

/** Turns any 401 on a signed-in request into one "session ended" event. */
function SessionEventsBridge() {
  const client = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (client.getQueryData(SESSION_KEY) == null) return;
      client.setQueryData(SESSION_END_KEY, 'expired');
      client.setQueryData(SESSION_KEY, null);
      toast.show('session_expired');
    });
    return () => setUnauthorizedHandler(null);
  }, [client, toast]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SessionEventsBridge />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
