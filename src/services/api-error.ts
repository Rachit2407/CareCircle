export type ApiErrorKind =
  | 'validation' // 422: the server rejected specific fields
  | 'unauthorized' // 401: no session, or the session ended
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409
  | 'server' // 5xx
  | 'client' // other 4xx
  | 'timeout' // a read timed out
  | 'offline' // a read could not reach the server
  | 'unconfirmed' // a WRITE timed out, dropped, or returned an unreadable 2xx: outcome unknown
  | 'invalid_response'; // a read returned a body that fails runtime validation

interface ApiErrorDetails {
  status?: number | undefined;
  code?: string | undefined;
  fieldErrors?: Readonly<Record<string, string>> | undefined;
}

/**
 * Normalised failure. The message is generic on purpose: server text is never copied into it,
 * so nothing sensitive can leak into logs, toasts or error boundaries.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(kind: ApiErrorKind, details: ApiErrorDetails = {}) {
    super(`Request failed (${kind})`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = details.status;
    this.code = details.code;
    this.fieldErrors = details.fieldErrors ?? {};
  }
}
