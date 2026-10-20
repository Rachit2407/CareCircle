import type { Session } from '@/types/session';
import { DEMO_CREDENTIALS, DEMO_SESSION } from './fixtures';

/** In-memory fake backend state. Only a "signed in" marker survives a page reload. */
const SIGNED_IN_FLAG = 'cc.mock.signed-in';

interface MockUser {
  password: string;
  session: Session;
}

const users = new Map<string, MockUser>([
  [DEMO_CREDENTIALS.email, { password: DEMO_CREDENTIALS.password, session: DEMO_SESSION }],
]);

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(SIGNED_IN_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeFlag(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(SIGNED_IN_FLAG, '1');
    else sessionStorage.removeItem(SIGNED_IN_FLAG);
  } catch {
    /* storage unavailable: the mock session simply will not survive a reload */
  }
}

let activeEmail: string | null = readFlag() ? DEMO_CREDENTIALS.email : null;
let nextUserNumber = 1;

const normalise = (email: string): string => email.trim().toLowerCase();

export const mockDb = {
  verify(email: string, password: string): boolean {
    return users.get(normalise(email))?.password === password;
  },
  emailTaken(email: string): boolean {
    return users.has(normalise(email));
  },
  addUser(displayName: string, email: string, password: string): Session {
    const key = normalise(email);
    nextUserNumber += 1;
    const session: Session = {
      user: { id: `usr_new_${nextUserNumber}`, displayName, email: key, timeZone: 'Asia/Kolkata' },
      circle: null,
    };
    users.set(key, { password, session });
    return session;
  },
  signIn(email: string): Session | null {
    const key = normalise(email);
    const user = users.get(key);
    if (!user) return null;
    activeEmail = key;
    writeFlag(true);
    return user.session;
  },
  signOut(): void {
    activeEmail = null;
    writeFlag(false);
  },
  currentSession(): Session | null {
    return activeEmail ? (users.get(activeEmail)?.session ?? null) : null;
  },
};
