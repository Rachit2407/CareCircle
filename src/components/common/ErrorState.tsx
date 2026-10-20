import { CircleAlert, Lock, TriangleAlert } from 'lucide-react';
import { ApiError } from '@/services/api-error';
import { cn } from '@/utils/cn';
import { describeError } from '@/utils/errorCopy';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  /** For reads this re-fetches. For an unconfirmed write, label it "Check again", not "Retry". */
  retryLabel?: string;
}

const UNCERTAIN = new Set(['unconfirmed', 'timeout', 'offline']);
const DENIED = new Set(['forbidden', 'not_found', 'unauthorized']);

export function ErrorState({ error, onRetry, retrying = false, retryLabel }: ErrorStateProps) {
  const copy = describeError(error);
  const kind = error instanceof ApiError ? error.kind : 'unknown';
  const uncertain = UNCERTAIN.has(kind);
  const Icon = DENIED.has(kind) ? Lock : uncertain ? TriangleAlert : CircleAlert;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-4 rounded-bubble border border-l-8 bg-paper p-5 shadow-soft',
        uncertain
          ? 'border-warning-border border-l-warning-fg'
          : 'border-danger-border border-l-danger-fg',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-1 h-6 w-6 shrink-0', uncertain ? 'text-warning-fg' : 'text-danger-fg')}
      />
      <div>
        <h2 className="font-display text-xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-lg text-ink-soft">{copy.body}</p>
        {copy.canRetry && onRetry && (
          <Button
            variant="secondary"
            className="mt-4"
            onClick={onRetry}
            loading={retrying}
            loadingText="Checking…"
          >
            {retryLabel ?? 'Try again'}
          </Button>
        )}
      </div>
    </div>
  );
}
