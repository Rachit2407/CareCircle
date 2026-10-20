import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { tones } from '@/styles/tokens';
import { cn } from '@/utils/cn';

type AlertTone = 'danger' | 'warning' | 'info';

const ICONS = { danger: CircleAlert, warning: TriangleAlert, info: Info } as const;

interface FormAlertProps {
  tone: AlertTone;
  title: string;
  children?: ReactNode;
}

/** Form-level message. The title is always text, so meaning never depends on colour. */
export function FormAlert({ tone, title, children }: FormAlertProps) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-2xl border p-4', tones[tone])}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        {children && <p className="mt-1 text-base">{children}</p>}
      </div>
    </div>
  );
}
