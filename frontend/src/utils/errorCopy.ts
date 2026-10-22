import { ApiError } from '@/services/api-error';

interface ErrorCopy {
  title: string;
  body: string;
  canRetry: boolean;
}

/**
 * Plain-language copy by error kind. Server messages are never shown. Forbidden and not-found
 * share one message so the UI cannot reveal whether a record exists.
 */
export function describeError(error: unknown): ErrorCopy {
  const kind = error instanceof ApiError ? error.kind : 'unknown';
  switch (kind) {
    case 'unauthorized':
      return {
        title: 'Your session has ended',
        body: 'Sign in again to continue.',
        canRetry: false,
      };
    case 'forbidden':
    case 'not_found':
      return {
        title: 'You can’t open this',
        body: 'It may have been removed, or you may not have access. Ask the person who invited you if you expected to see it.',
        canRetry: false,
      };
    case 'validation':
      return {
        title: 'Some details need fixing',
        body: 'Check the marked fields and try again.',
        canRetry: false,
      };
    case 'timeout':
      return {
        title: 'This is taking too long',
        body: 'The server did not answer in time. Check your connection and try again.',
        canRetry: true,
      };
    case 'offline':
      return {
        title: 'You appear to be offline',
        body: 'Check your connection, then try again.',
        canRetry: true,
      };
    case 'unconfirmed':
      return {
        title: 'We could not confirm this',
        body: 'Your request may or may not have gone through. Check the latest information before you try again.',
        canRetry: true,
      };
    case 'server':
      return {
        title: 'Something went wrong on our side',
        body: 'Try again in a moment.',
        canRetry: true,
      };
    case 'conflict':
      return {
        title: 'This changed while you were working',
        body: 'Reload to see the latest version, then make your change again.',
        canRetry: true,
      };
    case 'invalid_response':
      return {
        title: 'We received something unexpected',
        body: 'Try again. If it keeps happening, contact the person who runs your CareCircle.',
        canRetry: true,
      };
    default:
      return { title: 'Something went wrong', body: 'Try again in a moment.', canRetry: true };
  }
}
