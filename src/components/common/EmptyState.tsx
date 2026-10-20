import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Say why it is empty and what to do next. */
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-bubble bg-navy-50 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-marigold-100 text-marigold-700">
        <Icon aria-hidden="true" className="h-8 w-8" />
      </span>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="max-w-md text-lg text-ink-soft">{description}</p>
      {action}
    </div>
  );
}
