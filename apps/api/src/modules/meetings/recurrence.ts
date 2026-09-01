import type { RepeatInput } from '@ewp/contracts';

/**
 * The wall-clock reading in a zone, carried in a Date whose UTC fields hold it.
 * Working in these makes "the next Tuesday" mean the user's Tuesday rather than
 * the server's, which are different days for anyone whose offset crosses
 * midnight - an 02:00 meeting in Delhi is the previous evening in UTC.
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

  // Some environments render midnight as hour 24.
  const hour = read('hour') % 24;

  return new Date(
    Date.UTC(read('year'), read('month') - 1, read('day'), hour, read('minute'), read('second')),
  );
}

/** How far the zone is from UTC at that moment, daylight saving included. */
function offsetMs(instant: Date, timeZone: string): number {
  return wallClock(instant, timeZone).getTime() - instant.getTime();
}

/** The instant at which a zone reads that wall clock. */
function fromWallClock(wall: Date, timeZone: string): Date {
  const firstGuess = new Date(wall.getTime() - offsetMs(wall, timeZone));
  // One pass settles a guess that landed on the wrong side of a clock change.
  return new Date(wall.getTime() - offsetMs(firstGuess, timeZone));
}

/**
 * The start times for a repeating meeting, the first one included.
 *
 * Days are stepped with setDate rather than by adding milliseconds, so an
 * occurrence that crosses a daylight-saving boundary keeps its clock time: a
 * 09:00 standup stays at 09:00 rather than drifting to 08:00 for half the year.
 *
 * WEEKDAYS and CUSTOM skip days that do not match, and are capped so an
 * impossible pattern cannot spin: only 7 days are ever searched per occurrence,
 * which is enough to find the next matching weekday.
 */
export function occurrenceStarts(first: Date, repeat: RepeatInput, timeZone: string): Date[] {
  const wanted =
    repeat.frequency === 'WEEKDAYS'
      ? [1, 2, 3, 4, 5]
      : repeat.frequency === 'CUSTOM'
        ? [...new Set(repeat.days)].sort()
        : null;

  const starts: Date[] = [];
  // Stepped as wall clock in the organiser's zone, so every occurrence keeps
  // their time of day and lands on the weekday they meant.
  const cursor = wallClock(first, timeZone);

  // A pattern the first meeting does not itself match still starts from it:
  // the organiser picked that moment deliberately.
  starts.push(new Date(first));

  while (starts.length < repeat.count) {
    if (repeat.frequency === 'WEEKLY') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      starts.push(fromWallClock(cursor, timeZone));
      continue;
    }

    if (wanted === null) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      starts.push(fromWallClock(cursor, timeZone));
      continue;
    }

    // Walk forward to the next day the pattern allows.
    let stepped = 0;
    do {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      stepped += 1;
    } while (!wanted.includes(cursor.getUTCDay()) && stepped < 7);

    if (!wanted.includes(cursor.getUTCDay())) break;
    starts.push(fromWallClock(cursor, timeZone));
  }

  return starts;
}

/** Keeps each occurrence exactly as long as the one the organiser set up. */
export function endFor(start: Date, firstStart: Date, firstEnd: Date): Date {
  return new Date(start.getTime() + (firstEnd.getTime() - firstStart.getTime()));
}

/**
 * The clock this deployment books meetings against. Used when a caller does not
 * name a zone, so a request without one still lands on the right day rather
 * than on whatever the server's own clock happens to be.
 */
export const SCHEDULING_TIME_ZONE = 'America/Chicago';

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * The same pattern as an RFC 5545 rule, so the calendar can hold the series as
 * one recurring event instead of one event per occurrence.
 *
 * That distinction is the difference between an attendee receiving a single
 * invitation and receiving one per week, and between the organiser getting one
 * acceptance and getting one per week per person.
 *
 * COUNT includes the first occurrence, and a rule's start is always its first
 * instance even when it does not match BYDAY - both of which match how
 * occurrenceStarts builds the local rows, so the two never disagree.
 */
export function toRRule(repeat: RepeatInput): string {
  if (repeat.frequency === 'DAILY') return `RRULE:FREQ=DAILY;COUNT=${repeat.count}`;

  const days =
    repeat.frequency === 'WEEKDAYS'
      ? ['MO', 'TU', 'WE', 'TH', 'FR']
      : repeat.frequency === 'CUSTOM'
        ? [...new Set(repeat.days)].sort().map((day) => RRULE_DAYS[day] as string)
        : null;

  if (days === null) return `RRULE:FREQ=WEEKLY;COUNT=${repeat.count}`;
  return `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')};COUNT=${repeat.count}`;
}
