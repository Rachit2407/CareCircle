/** Three overlapping circles in the day palette: a circle of people sharing one day. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <circle cx="18" cy="19" r="12" className="fill-marigold-400" />
      <circle cx="30" cy="19" r="12" className="fill-daypart-afternoon opacity-90" />
      <circle cx="24" cy="30" r="12" className="fill-daypart-evening opacity-90" />
    </svg>
  );
}
