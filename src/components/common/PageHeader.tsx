import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** One short line of context. */
  description?: string;
  /** The page's single primary action. */
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-lg text-ink-soft">{description}</p>}
      </div>
      {action}
    </header>
  );
}
