import { tones } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { TONE_ICONS } from '../ui/toneIcons';
import { STATUS_MAP, type StatusKey } from './statusMap';

export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  const { label, tone } = STATUS_MAP[status];
  const Icon = TONE_ICONS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold',
        tones[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {label}
    </span>
  );
}
