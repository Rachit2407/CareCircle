import type { Tone } from '@/styles/tokens';

/**
 * The single source of truth for every status in the app: key -> visible label -> tone.
 * Status is always rendered as words (rule: never colour-only); the tone only supplements it.
 */
export const STATUS_MAP = {
  // Care tasks
  pending: { label: 'Pending', tone: 'quiet' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'quiet' },
  unassigned: { label: 'Unassigned', tone: 'warning' },
  // Medication reminders and appointments
  scheduled: { label: 'Scheduled', tone: 'info' },
  sent: { label: 'Sent', tone: 'info' },
  acknowledged: { label: 'Acknowledged', tone: 'success' },
  reported_completed: { label: 'Reported completed', tone: 'success' },
  skipped: { label: 'Skipped', tone: 'warning' },
  missed: { label: 'Missed', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
  // Notifications: queued is not delivered
  queued: { label: 'Queued', tone: 'quiet' },
  delivered: { label: 'Delivered', tone: 'success' },
  unread: { label: 'Unread', tone: 'info' },
  read: { label: 'Read', tone: 'quiet' },
  // Assistant and writes
  processing: { label: 'Processing request', tone: 'info' },
  needs_clarification: { label: 'Needs clarification', tone: 'warning' },
  awaiting_confirmation: { label: 'Awaiting confirmation', tone: 'warning' },
  saved: { label: 'Saved', tone: 'success' },
  could_not_complete: { label: 'Could not complete', tone: 'danger' },
  unconfirmed: { label: 'Unconfirmed', tone: 'warning' },
  // Invitations
  accepted: { label: 'Accepted', tone: 'success' },
  expired: { label: 'Expired', tone: 'warning' },
  revoked: { label: 'Revoked', tone: 'quiet' },
  // AI-generated content
  ai_suggestion: { label: 'AI suggestion', tone: 'ai' },
  unreviewed: { label: 'Not yet reviewed', tone: 'quiet' },
  reviewed: { label: 'Reviewed', tone: 'success' },
  flagged: { label: 'Flagged for correction', tone: 'warning' },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export type StatusKey = keyof typeof STATUS_MAP;
