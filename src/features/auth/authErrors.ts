import { ApiError } from '@/services/api-error';
import { describeError } from '@/utils/errorCopy';

export interface AuthFailure {
  tone: 'danger' | 'warning';
  title: string;
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
}

/**
 * Sign-in and register are writes. A timeout or dropped connection means we do not know whether
 * it worked, so the copy says "could not confirm" and never auto-retries.
 */
export function describeAuthFailure(error: unknown, context: 'login' | 'register'): AuthFailure {
  if (error instanceof ApiError) {
    if (error.kind === 'unauthorized') {
      return {
        tone: 'danger',
        title: 'Sign-in failed',
        message: 'The email or password is incorrect. Check both and try again.',
        fieldErrors: {},
      };
    }
    if (error.kind === 'validation') {
      return {
        tone: 'danger',
        title: 'Some details need fixing',
        message: 'Check the marked fields and try again.',
        fieldErrors: error.fieldErrors,
      };
    }
    if (error.kind === 'unconfirmed') {
      return context === 'login'
        ? {
            tone: 'warning',
            title: 'We could not confirm your sign-in',
            message: 'Check your connection, then try again.',
            fieldErrors: {},
          }
        : {
            tone: 'warning',
            title: 'We could not confirm your account was created',
            message:
              'Try signing in first, in case it went through. If that fails, register again.',
            fieldErrors: {},
          };
    }
  }
  const copy = describeError(error);
  return { tone: 'danger', title: copy.title, message: copy.body, fieldErrors: {} };
}
