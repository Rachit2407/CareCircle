export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  assistant: '/assistant',
  medications: '/medications',
  appointments: '/appointments',
  tasks: '/tasks',
  careNotes: '/care-notes',
  family: '/family',
  notifications: '/notifications',
  settings: '/settings',
  // Create routes used by the global quick actions. Phase 3-5 decide whether these are pages or dialogs.
  taskNew: '/tasks/new',
  appointmentNew: '/appointments/new',
  careNoteNew: '/care-notes/new',
  /** Developer-only UI kit. Not part of the product. */
  kit: '/dev/kit',
} as const;

/**
 * Where a signed-in user lands. Phase 1 has no dashboard yet, so development lands on the UI kit.
 * Phase 2 removes the DEV branch.
 */
export const LANDING_ROUTE: string = import.meta.env.DEV ? ROUTES.kit : ROUTES.dashboard;
