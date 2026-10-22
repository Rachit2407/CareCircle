import { sessionSchema } from '@/schemas/session';
import type { LoginInput, RegisterInput } from '@/schemas/auth';
import type { Session } from '@/types/session';
import { ApiError } from './api-error';
import { api } from './api-client';
import { PROPOSED_ENDPOINTS } from './endpoints';

export const authService = {
  /** Resolves to null when there is no valid session (401), so callers can route to sign-in. */
  async getSession(signal?: AbortSignal): Promise<Session | null> {
    try {
      return await api.get(PROPOSED_ENDPOINTS.session, sessionSchema, {
        signal,
        suppressUnauthorized: true,
      });
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthorized') return null;
      throw error;
    }
  },

  login(input: LoginInput): Promise<Session> {
    return api.post(PROPOSED_ENDPOINTS.login, input, sessionSchema, { suppressUnauthorized: true });
  },

  /** The confirm-password field is a client-only check and is never sent. */
  register(input: RegisterInput): Promise<Session> {
    const { displayName, email, password } = input;
    return api.post(PROPOSED_ENDPOINTS.register, { displayName, email, password }, sessionSchema, {
      suppressUnauthorized: true,
    });
  },

  logout(): Promise<void> {
    return api.postVoid(PROPOSED_ENDPOINTS.logout, undefined);
  },
};
