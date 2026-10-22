import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';

interface AiSuggestionPanelProps {
  title: string;
  children: ReactNode;
  /** Controls such as Confirm, Edit and Cancel. */
  footer?: ReactNode;
  /** Plain-text state next to the badge. */
  statusNote?: string;
  className?: string;
}

/** Every AI-generated artifact uses this: dashed border plus an "AI suggestion" badge. */
export function AiSuggestionPanel({
  title,
  children,
  footer,
  statusNote = 'Not saved yet',
  className,
}: AiSuggestionPanelProps) {
  return (
    <section aria-label={`AI suggestion: ${title}`} className={cn(ui.surface.ai, 'p-5', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={ui.aiBadge}>
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          AI suggestion
        </span>
        <span className="text-sm font-bold text-ai-700">{statusNote}</span>
      </div>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <div className="mt-2 text-lg">{children}</div>
      {footer && <div className="mt-4 flex flex-wrap gap-3">{footer}</div>}
    </section>
  );
}
