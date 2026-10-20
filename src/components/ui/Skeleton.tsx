import { cn } from '@/utils/cn';

/** Decorative placeholder. Wrap groups in a labelled loading region (see QueryBoundary). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-navy-100', className)} />
  );
}
