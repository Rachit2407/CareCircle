import type { Tone } from '@/styles/tokens';

/**
 * Every toast is a fixed message chosen by key. Toasts cannot be built from runtime strings, so
 * health details, names, transcripts and IDs can never end up in toast text (spec section 7).
 * "success" entries must only be shown after a 2xx response.
 */
export const TOAST_CATALOG = {
  session_expired: { tone: 'warning', title: 'Your session has ended. Sign in again to continue.' },
  sign_out_unconfirmed: {
    tone: 'danger',
    title: 'We could not confirm that you signed out. You are still signed in.',
  },
  request_unconfirmed: {
    tone: 'warning',
    title: 'We could not confirm that request. Check the latest information before you try again.',
  },
  connection_lost: { tone: 'info', title: 'Your connection dropped. Reconnect, then try again.' },
} as const satisfies Record<string, { tone: Tone; title: string }>;

export type ToastKey = keyof typeof TOAST_CATALOG;
