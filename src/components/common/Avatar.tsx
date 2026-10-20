import { cn } from '@/utils/cn';

const TONES = [
  'bg-navy-100 text-navy-800',
  'bg-marigold-100 text-marigold-700',
  'bg-ai-100 text-ai-700',
  'bg-info-bg text-info-fg',
] as const;

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

/** Initials only. Decorative: the person's name is always shown as text beside it. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-base font-bold',
        tone,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
