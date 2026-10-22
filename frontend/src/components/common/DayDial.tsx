import { DAY_SEGMENTS, type DayPartId } from '@/utils/dayparts';

const CENTER = 180;
const RADIUS = 128;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 7;

const STROKE: Record<DayPartId, string> = {
  morning: 'stroke-daypart-morning',
  afternoon: 'stroke-daypart-afternoon',
  evening: 'stroke-daypart-evening',
  night: 'stroke-daypart-night',
};

/** A circle of five people inside a 24-hour ring. Decorative: it carries no data. */
const PEOPLE = [
  { fill: 'fill-marigold-400', size: 15 },
  { fill: 'fill-daypart-afternoon', size: 12 },
  { fill: 'fill-paper', size: 14 },
  { fill: 'fill-daypart-evening', size: 12 },
  { fill: 'fill-navy-200', size: 13 },
].map((person, index) => {
  const angle = (index / 5) * 2 * Math.PI;
  return { ...person, x: CENTER + 74 * Math.sin(angle), y: CENTER - 74 * Math.cos(angle) };
});

export function DayDial({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 360"
      aria-hidden="true"
      focusable="false"
      className={`animate-dial-in ${className ?? ''}`}
    >
      <circle cx={CENTER} cy={CENTER} r={112} className="fill-navy-800" />
      <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
        {DAY_SEGMENTS.map((segment) => {
          const start = (segment.startHour / 24) * CIRCUMFERENCE;
          const length = ((segment.endHour - segment.startHour) / 24) * CIRCUMFERENCE - GAP;
          return (
            <circle
              key={`${segment.id}-${segment.startHour}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={26}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-(start + GAP / 2)}
              className={STROKE[segment.id]}
            />
          );
        })}
      </g>
      <polygon
        points={PEOPLE.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        strokeWidth={2}
        className="stroke-navy-600"
      />
      {PEOPLE.map((person) => (
        <circle
          key={person.fill}
          cx={person.x}
          cy={person.y}
          r={person.size}
          className={person.fill}
        />
      ))}
    </svg>
  );
}
