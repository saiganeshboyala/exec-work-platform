/** Calendar maths, kept out of the component so fast refresh stays happy. */

/**
 * Monday-first grid covering the whole month, padded to six complete weeks so
 * the grid never changes height as you page through months.
 */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // getDay() is Sunday-based; shift so Monday is 0.
  const lead = (first.getDay() + 6) % 7;

  const start = new Date(first);
  start.setDate(first.getDate() - lead);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/** Monday-first week containing the anchor. */
export function weekGrid(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * The window a view needs to fetch. Kept beside the grid maths so the range
 * queried and the range drawn can never drift apart.
 */
export function rangeFor(view: 'day' | 'week' | 'month', anchor: Date): [Date, Date] {
  if (view === 'day') return [startOfDay(anchor), endOfDay(anchor)];

  const days = view === 'week' ? weekGrid(anchor) : monthGrid(anchor);
  return [startOfDay(days[0] as Date), endOfDay(days[days.length - 1] as Date)];
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The clock meetings are booked against, wherever the person booking happens to
 * be. Everyone types and reads scheduling times in this zone, so a standup is
 * at the same hour of the working day for the team it belongs to.
 *
 * Central Standard all year, deliberately. Regina keeps UTC-6 and the name CST
 * through the summer, where Chicago would move to CDT - so an hour booked here
 * is the same hour in June as in January, and never renames itself. The
 * trade-off is that from March to November this reads an hour behind the clocks
 * people in Chicago are actually looking at.
 */
export const SCHEDULING_TIME_ZONE = 'America/Regina';

/** Always "CST" for this zone, read from it rather than written by hand. */
export function schedulingZoneLabel(at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SCHEDULING_TIME_ZONE,
      timeZoneName: 'short',
    }).formatToParts(at);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'CST';
  } catch {
    return 'CST';
  }
}

/**
 * The wall-clock reading in a zone, carried in a Date whose UTC fields hold it.
 * The same trick the server uses, and for the same reason: a day and an hour
 * only mean something once you say whose.
 */
function wallClock(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return new Date(
    Date.UTC(read('year'), read('month') - 1, read('day'), read('hour') % 24, read('minute'), read('second')),
  );
}

function offsetMs(instant: Date, timeZone: string): number {
  return wallClock(instant, timeZone).getTime() - instant.getTime();
}

/**
 * Reads what somebody typed into a datetime-local field as a time in the
 * scheduling zone. Without this the browser would read "09:00" as nine o'clock
 * wherever the person is sitting, and two colleagues booking the same slot
 * would create two different meetings.
 */
export function schedulingInputToDate(value: string): Date {
  const [date, time] = value.split('T');
  if (!date || !time) return new Date(NaN);

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const wall = Date.UTC(year as number, (month as number) - 1, day as number, hour as number, minute as number);
  const guess = new Date(wall - offsetMs(new Date(wall), SCHEDULING_TIME_ZONE));
  // A second pass settles a guess that landed on the wrong side of a clock change.
  return new Date(wall - offsetMs(guess, SCHEDULING_TIME_ZONE));
}

/** The reverse: an instant as the scheduling zone's wall clock, for the field. */
export function dateToSchedulingInput(iso: string | Date): string {
  const instant = typeof iso === 'string' ? new Date(iso) : iso;
  return wallClock(instant, SCHEDULING_TIME_ZONE).toISOString().slice(0, 16);
}

/** The next whole hour in the scheduling zone, which is what people mean. */
export function defaultSchedulingStart(): string {
  const now = new Date();
  const wall = wallClock(now, SCHEDULING_TIME_ZONE);
  wall.setUTCMinutes(0, 0, 0);
  wall.setUTCHours(wall.getUTCHours() + 1);
  return wall.toISOString().slice(0, 16);
}
