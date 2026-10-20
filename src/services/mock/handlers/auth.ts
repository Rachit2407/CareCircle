import { z } from 'zod';
import { loginSchema } from '@/schemas/auth';
import type { Session } from '@/types/session';
import { PROPOSED_ENDPOINTS } from '../../endpoints';
import type { MockReply, MockRoute } from '../engine';
import type { MockScenario } from '../scenario';
import { mockDb } from '../state';

const registerBodySchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(10),
});

/** The "empty" scenario models an account that has no care circle yet. */
function present(session: Session, scenario: MockScenario): Session {
  return scenario === 'empty' ? { ...session, circle: null } : session;
}

function invalid(fieldErrors: Record<string, string>): MockReply {
  return { status: 422, body: { code: 'validation_failed', fieldErrors } };
}

export const authRoutes: readonly MockRoute[] = [
  {
    method: 'GET',
    pattern: PROPOSED_ENDPOINTS.session,
    requiresSession: true,
    handle: (_request, scenario) => {
      const session = mockDb.currentSession();
      if (!session) return { status: 401, body: { code: 'session_required' } };
      return { status: 200, body: present(session, scenario) };
    },
  },
  {
    method: 'POST',
    pattern: PROPOSED_ENDPOINTS.login,
    requiresSession: false,
    demoFieldErrors: { password: 'The server could not accept this password.' },
    handle: ({ body }, scenario) => {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return invalid({ email: 'Enter a valid email address.' });
      const { email, password } = parsed.data;
      if (!mockDb.verify(email, password))
        return { status: 401, body: { code: 'invalid_credentials' } };
      const session = mockDb.signIn(email);
      if (!session) return { status: 401, body: { code: 'invalid_credentials' } };
      return { status: 200, body: present(session, scenario) };
    },
  },
  {
    method: 'POST',
    pattern: PROPOSED_ENDPOINTS.register,
    requiresSession: false,
    demoFieldErrors: { email: 'An account with this email already exists.' },
    handle: ({ body }, scenario) => {
      const parsed = registerBodySchema.safeParse(body);
      if (!parsed.success) return invalid({ email: 'Check this email address and password.' });
      const { displayName, email, password } = parsed.data;
      if (mockDb.emailTaken(email))
        return invalid({ email: 'An account with this email already exists.' });
      const created = mockDb.addUser(displayName, email, password);
      const session = mockDb.signIn(created.user.email) ?? created;
      return { status: 201, body: present(session, scenario) };
    },
  },
  {
    method: 'POST',
    pattern: PROPOSED_ENDPOINTS.logout,
    requiresSession: true,
    handle: () => {
      mockDb.signOut();
      return { status: 204 };
    },
  },
];
