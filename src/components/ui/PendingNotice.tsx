import { LoaderCircle } from 'lucide-react';

/**
 * Live region that is always mounted so screen readers announce it. While a write is pending it
 * says "Awaiting confirmation"; nothing here ever claims success.
 */
export function PendingNotice({ pending }: { pending: boolean }) {
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-sm font-bold text-ink-soft">
      {pending && (
        <span className="inline-flex items-center gap-2">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          Awaiting confirmation from the server
        </span>
      )}
    </p>
  );
}
