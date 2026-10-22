import { cn } from '@/utils/cn';
import { DAY_SEGMENTS, type DayPartId } from '@/utils/dayparts';

const BAR: Record<DayPartId, string> = {
  morning: 'bg-daypart-morning',
  afternoon: 'bg-daypart-afternoon',
  evening: 'bg-daypart-evening',
  night: 'bg-daypart-night',
};

/**
 * The day as a ribbon with a marker at "now" in the user's time zone. Decorative only: the same
 * information is in text next to it ("Morning, 9:42 am IST"), so nothing depends on colour.
 */
export function DayPartBar({ minutesIntoDay }: { minutesIntoDay: number }) {
  const position = Math.min(98.5, Math.max(1.5, (minutesIntoDay / 1440) * 100));
  return (
    <div aria-hidden="true" className="relative flex h-1.5 w-full">
      {DAY_SEGMENTS.map((segment) => (
        <span
          key={`${segment.id}-${segment.startHour}`}
          className={cn('h-full', BAR[segment.id])}
          style={{ width: `${((segment.endHour - segment.startHour) / 24) * 100}%` }}
        />
      ))}
      <span
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-paper bg-navy-900 shadow-soft"
        style={{ left: `${position}%` }}
      />
    </div>
  );
}
