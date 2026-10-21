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
  task_created: { tone: 'success', title: 'Care task created successfully.' },
  task_updated: { tone: 'success', title: 'Care task updated.' },
  task_completed: { tone: 'success', title: 'Care task marked as completed.' },
  dose_confirmed: { tone: 'success', title: 'Medication dose confirmed.' },
  schedule_created: { tone: 'success', title: 'Medication schedule created.' },
  schedule_updated: { tone: 'success', title: 'Medication schedule updated.' },
  appointment_created: { tone: 'success', title: 'Appointment scheduled successfully.' },
  appointment_updated: { tone: 'success', title: 'Appointment details updated.' },
  appointment_cancelled: { tone: 'success', title: 'Appointment has been cancelled.' },
  checkin_saved: { tone: 'success', title: 'Care check-in recorded successfully.' },
  health_reading_saved: { tone: 'success', title: 'Health reading recorded.' },
  record_uploaded: { tone: 'success', title: 'Health record stored and verified.' },
  alert_dispatched: { tone: 'success', title: 'Caregiver alert dispatched to family circle.' },
  relationship_updated: { tone: 'success', title: 'Care circle relationship updated.' },
  relationship_created: { tone: 'success', title: 'New care circle connection established.' },
  settings_saved: { tone: 'success', title: 'Preferences saved.' },
  action_confirmed: { tone: 'success', title: 'Assistant action confirmed and processed.' },
  action_cancelled: { tone: 'info', title: 'Assistant action cancelled.' },
} as const satisfies Record<string, { tone: Tone; title: string }>;

export type ToastKey = keyof typeof TOAST_CATALOG;
