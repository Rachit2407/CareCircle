/**
 * The only date formatter in the app. Every schedule-related string goes through
 * `formatDateTime(iso, timeZone)` so the time zone is always explicit and the browser locale and
 * browser time zone are never used implicitly.
 */

/** Explicit locale. Phase 4 (Settings) can feed the user's language preference in here. */
const APP_LOCALE = 'en-IN';
const UNAVAILABLE = 'Date unavailable';

type DatePart = 'date' | 'time' | 'datetime' | 'weekday-date';

interface FormatOptions {
  part?: DatePart;
  /** Append the zone label (for example "IST") to anything that contains a time. Default: true. */
  withZone?: boolean;
}

const PART_OPTIONS: Record<DatePart, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit', hour12: true },
  datetime: {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  'weekday-date': { weekday: 'short', day: 'numeric', month: 'short' },
};

/** An unknown zone falls back to UTC, and the label says "UTC" so the fallback is never hidden. */
function resolveZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat(APP_LOCALE, { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

export function formatDateTime(iso: string, timeZone: string, options: FormatOptions = {}): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;

  const { part = 'datetime', withZone = true } = options;
  const zone = resolveZone(timeZone);
  const text = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: zone,
    ...PART_OPTIONS[part],
  }).format(date);
  if (!withZone || part === 'date' || part === 'weekday-date') return text;

  const label = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((piece) => piece.type === 'timeZoneName')?.value;
  return `${text} ${label ?? zone}`;
}

/** Minutes since midnight (0-1439) at `date` in `timeZone`. */
export function minutesIntoDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: resolveZone(timeZone),
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (read('hour') % 24) * 60 + read('minute');
}
