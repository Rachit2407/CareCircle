import type { Session } from '@/types/session';

/** Fixtures use the exact types the real API client returns. */
export const DEMO_CREDENTIALS = {
  email: 'demo@carecircle.test',
  password: 'Demo-pass-123',
} as const;

export const DEMO_SESSION: Session = {
  user: {
    id: 'usr_demo',
    displayName: 'Anita Rao',
    email: DEMO_CREDENTIALS.email,
    timeZone: 'Asia/Kolkata',
    role: 'caregiver',
    phone: '+91 98765 43210',
  },
  circle: {
    id: 'cir_demo',
    name: 'Rao family circle',
    recipientName: 'Raghav Rao',
    role: 'Primary caregiver',
  },
};
