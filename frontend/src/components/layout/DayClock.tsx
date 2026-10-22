import { DAY_PART_LABEL, dayPartAt } from '@/utils/dayparts';
import { formatDateTime, minutesIntoDay } from '@/utils/datetime';

interface DayClockProps {
  now: Date;
  timeZone: string;
}

/** Day part, date and time with the zone label, always in the user's time zone. */
export function DayClock({ now, timeZone }: DayClockProps) {
  const iso = now.toISOString();
  const part = DAY_PART_LABEL[dayPartAt(minutesIntoDay(now, timeZone))];
  return (
    <p className="text-sm leading-tight text-ink-soft">
      <span className="font-bold text-ink">{part}</span>{' '}
      <time dateTime={iso}>{formatDateTime(iso, timeZone, { part: 'weekday-date' })}</time>{' '}
      <time dateTime={iso}>{formatDateTime(iso, timeZone, { part: 'time' })}</time>
    </p>
  );
}
