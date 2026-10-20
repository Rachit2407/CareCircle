/**
 * PROPOSED endpoints: NOT in the spec's section 9 contract. Auth screens exist in the spec
 * (/login, /register) but no auth routes do, so these are assumptions that the backend owners
 * must confirm or replace. They are isolated here so a change is one edit.
 */
export const PROPOSED_ENDPOINTS = {
  session: '/auth/session',
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
} as const;
