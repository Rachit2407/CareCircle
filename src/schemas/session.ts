import { z } from 'zod';

/**
 * Everything about identity comes from the server. The client never decides `role` or
 * `careCircleId`; it only displays what the session response says.
 */
export const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    /** IANA zone, e.g. "Asia/Kolkata". */
    timeZone: z.string(),
  }),
  /** The active care circle, or null when the account has none yet. */
  circle: z
    .object({
      id: z.string(),
      name: z.string(),
      recipientName: z.string(),
      role: z.string(),
    })
    .nullable(),
});
