import type { ReactNode } from 'react';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';

interface SavedRecordPanelProps {
  title: string;
  /** ISO timestamp returned by the server for this record. */
  savedAt: string;
  timeZone: string;
  children: ReactNode;
  className?: string;
}

/** A persisted record: solid border and a server timestamp, never dashed. */
export function SavedRecordPanel({
  title,
  savedAt,
  timeZone,
  children,
  className,
}: SavedRecordPanelProps) {
  return (
    <section aria-label={title} className={cn(ui.surface.saved, 'p-5', className)}>
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="mt-2 text-lg">{children}</div>
      <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
        Saved <time dateTime={savedAt}>{formatDateTime(savedAt, timeZone)}</time>
      </p>
    </section>
  );
}
