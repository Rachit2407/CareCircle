export type DayPartId = 'morning' | 'afternoon' | 'evening' | 'night';

interface DaySegment {
  id: DayPartId;
  startHour: number;
  endHour: number;
}

/** Night wraps midnight, so it appears twice. Hours are local to the user's time zone. */
export const DAY_SEGMENTS: readonly DaySegment[] = [
  { id: 'night', startHour: 0, endHour: 5 },
  { id: 'morning', startHour: 5, endHour: 12 },
  { id: 'afternoon', startHour: 12, endHour: 17 },
  { id: 'evening', startHour: 17, endHour: 21 },
  { id: 'night', startHour: 21, endHour: 24 },
];

export const DAY_PART_LABEL: Record<DayPartId, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export function dayPartAt(minutesIntoDay: number): DayPartId {
  const hour = minutesIntoDay / 60;
  const match = DAY_SEGMENTS.find((s) => hour >= s.startHour && hour < s.endHour);
  return match?.id ?? 'night';
}
