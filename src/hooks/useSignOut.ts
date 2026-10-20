import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/services/api-error';
import { authService } from '@/services/authService';
import { SESSION_END_KEY, SESSION_KEY } from './useSession';

/**
 * Signs out only after the server confirms. On success it wipes every cached query (no health
 * data lingers in memory) and the auth guard sends the user to /login without a return path.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
      queryClient.setQueryData(SESSION_END_KEY, 'signed_out');
      queryClient.setQueryData(SESSION_KEY, null);
    },
    onError: (error) => {
      // A 401 already ended the session and showed its own message; do not contradict it.
      if (error instanceof ApiError && error.kind === 'unauthorized') return;
      toast.show('sign_out_unconfirmed');
    },
  });
}
